import { Injectable, Logger } from '@nestjs/common';
import { SmartScanStreamEvent } from './smart-scan.service';

type Subscriber = (event: SmartScanStreamEvent) => void;

interface Channel {
  /** Replayed to a listener that connects after the scan has already started. */
  history: SmartScanStreamEvent[];
  subscribers: Set<Subscriber>;
  finished: boolean;
  expiresAt: number;
}

// A scan takes 20-40s; this is generous enough to cover a slow one plus the
// listener reconnecting, and short enough that nothing lingers.
const CHANNEL_TTL_MS = 5 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

/**
 * Carries scan progress from the upload request to the client's progress stream.
 *
 * The two are separate requests because the upload has to go over multipart, which
 * React Native can only send through XHR, while reading a stream needs `expo/fetch`
 * — no single request can do both. The client generates a scan id, sends it with
 * the file, and listens on that id.
 *
 * In-memory and single-process on purpose: this is ephemeral UI progress, and losing
 * it costs the user a progress bar, not a scan. The scan's real result comes back on
 * the upload response either way.
 */
@Injectable()
export class ScanProgressBus {
  private readonly logger = new Logger(ScanProgressBus.name);
  private readonly channels = new Map<string, Channel>();

  constructor() {
    const sweep = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS);
    // Don't hold the process open for a cache of progress events.
    sweep.unref?.();
  }

  publish(scanId: string, event: SmartScanStreamEvent): void {
    const channel = this.channel(scanId);
    channel.history.push(event);
    channel.expiresAt = Date.now() + CHANNEL_TTL_MS;
    for (const subscriber of channel.subscribers) {
      try {
        subscriber(event);
      } catch (err) {
        this.logger.warn(`Progress subscriber for ${scanId} threw: ${(err as Error).message}`);
      }
    }
  }

  /** Marks a scan done so any listener still attached can close. */
  finish(scanId: string): void {
    const channel = this.channels.get(scanId);
    if (!channel) return;
    channel.finished = true;
    channel.subscribers.clear();
  }

  /**
   * Replays what has happened so far, then streams the rest. Returns an unsubscribe
   * function, and `finished` for a scan that was already over before anyone listened.
   */
  subscribe(scanId: string, subscriber: Subscriber): { unsubscribe: () => void; finished: boolean } {
    const channel = this.channel(scanId);
    for (const event of channel.history) {
      subscriber(event);
    }
    if (channel.finished) {
      return { unsubscribe: () => undefined, finished: true };
    }
    channel.subscribers.add(subscriber);
    return {
      unsubscribe: () => channel.subscribers.delete(subscriber),
      finished: false,
    };
  }

  private channel(scanId: string): Channel {
    let channel = this.channels.get(scanId);
    if (!channel) {
      channel = { history: [], subscribers: new Set(), finished: false, expiresAt: Date.now() + CHANNEL_TTL_MS };
      this.channels.set(scanId, channel);
    }
    return channel;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [scanId, channel] of this.channels) {
      if (channel.expiresAt <= now) {
        this.channels.delete(scanId);
      }
    }
  }
}
