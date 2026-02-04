"use client";

import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from "react";
import { Button } from "react-bootstrap";
import { FaMicrophone, FaStop, FaPlay, FaPause, FaTrash } from "react-icons/fa";

export type RecordedAudio = {
    blob: Blob;
    url: string;
    mimeType: string;
};

export type AudioRecorderHandle = {
    start: () => Promise<void>;
    stop: () => void;
    clear: () => Promise<void>;
    togglePlay: () => void;
    pause: () => void;
    getValue: () => RecordedAudio | null;
    getBlob: () => Blob | null;
    isRecording: () => boolean;
    isPlaying: () => boolean;
};

type Props = {
    disabled?: boolean;

    /** Controlled value (optional). */
    value?: RecordedAudio | null;
    /** Controlled setter (optional). */
    onChange?: (next: RecordedAudio | null) => void;

    className?: string;

    /** Called when permission fails or browser lacks support */
    onError?: (message: string) => void;
};

function pickSupportedMimeType() {
    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
    ];
    for (const t of candidates) {
        if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
    }
    return undefined;
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

export const AudioRecorder = forwardRef<AudioRecorderHandle, Props>(function AudioRecorder(
    { disabled, value, onChange, className, onError },
    ref
) {
    // MediaRecorder
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);

    // Hidden audio element (we control playback)
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Canvas waveform
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Live recording visualizer (analyser)
    const recAudioCtxRef = useRef<AudioContext | null>(null);
    const recAnalyserRef = useRef<AnalyserNode | null>(null);
    const recSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const recDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
    const recRafRef = useRef<number | null>(null);

    // Playback waveform peaks + playhead animation
    const decodeCtxRef = useRef<AudioContext | null>(null);
    const waveformPeaksRef = useRef<Float32Array | null>(null);
    const playRafRef = useRef<number | null>(null);

    // State
    const isControlled = typeof onChange === "function";
    const [internalValue, setInternalValue] = useState<RecordedAudio | null>(null);
    const current = isControlled ? (value ?? null) : internalValue;

    const [recording, setRecording] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = useRef<number | null>(null);

    const [error, setError] = useState<string | null>(null);

    const mimeType = useMemo(() => pickSupportedMimeType(), []);

    const setNext = (next: RecordedAudio | null) => {
        if (isControlled) onChange?.(next);
        else setInternalValue(next);
    };

    // ---------- helpers ----------
    const stopStream = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const stopTimer = () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
    };

    const startTimer = () => {
        stopTimer();
        setElapsed(0);
        timerRef.current = window.setInterval(() => setElapsed((t) => t + 1), 1000);
    };

    const stopPlayAnim = () => {
        if (playRafRef.current) cancelAnimationFrame(playRafRef.current);
        playRafRef.current = null;
    };

    const stopRecAnim = () => {
        if (recRafRef.current) cancelAnimationFrame(recRafRef.current);
        recRafRef.current = null;
    };

    const stopRecordingVisualizer = async () => {
        stopRecAnim();

        recAnalyserRef.current = null;
        recDataRef.current = null;

        try {
            recSourceRef.current?.disconnect();
        } catch { }
        recSourceRef.current = null;

        try {
            await recAudioCtxRef.current?.close();
        } catch { }
        recAudioCtxRef.current = null;
    };

    const ensureCanvasSize = (canvas: HTMLCanvasElement) => {
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        const w = Math.floor(cssW * dpr);
        const h = Math.floor(cssH * dpr);

        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        return { w, h, dpr };
    };

    const drawEmpty = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const { w, h } = ensureCanvasSize(canvas);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(0,0,0,0.03)";
        ctx.fillRect(0, 0, w, h);
    };

    // Live visualizer during recording
    const drawRecordingBars = () => {
        const canvas = canvasRef.current;
        const analyser = recAnalyserRef.current;
        const data = recDataRef.current;
        if (!canvas || !analyser || !data) return;

        const { w, h, dpr } = ensureCanvasSize(canvas);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        analyser.getByteFrequencyData(data);

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(13,110,253,0.06)";
        ctx.fillRect(0, 0, w, h);

        const barCount = 32;
        const step = Math.floor(data.length / barCount);
        const gap = Math.max(2 * dpr, 2);
        const barW = (w - gap * (barCount - 1)) / barCount;

        for (let i = 0; i < barCount; i++) {
            const v = data[i * step] ?? 0;
            const amp = v / 255;
            const barH = Math.max(2 * dpr, amp * h);
            const x = i * (barW + gap);
            const y = h - barH;

            ctx.fillStyle = "rgba(13,110,253,0.85)";
            ctx.fillRect(x, y, barW, barH);
        }

        recRafRef.current = requestAnimationFrame(drawRecordingBars);
    };

    const startRecordingVisualizer = async (stream: MediaStream) => {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx: AudioContext = new AudioCtx();
        recAudioCtxRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.85;
        recAnalyserRef.current = analyser;

        const src = ctx.createMediaStreamSource(stream);
        recSourceRef.current = src;
        src.connect(analyser);

        recDataRef.current = new Uint8Array(
            new ArrayBuffer(analyser.frequencyBinCount)
        );

        drawRecordingBars();
    };

    // Playback waveform rendering
    const getDecodeContext = () => {
        if (decodeCtxRef.current) return decodeCtxRef.current;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        decodeCtxRef.current = new AudioCtx();
        return decodeCtxRef.current;
    };

    const computePeaks = (buffer: AudioBuffer, bars: number) => {
        // Merge channels by taking max abs across channels
        const channels = buffer.numberOfChannels;
        const length = buffer.length;

        const blockSize = Math.floor(length / bars);
        const peaks = new Float32Array(bars);

        for (let i = 0; i < bars; i++) {
            const start = i * blockSize;
            const end = i === bars - 1 ? length : start + blockSize;

            let max = 0;
            for (let c = 0; c < channels; c++) {
                const data = buffer.getChannelData(c);
                for (let j = start; j < end; j++) {
                    const v = Math.abs(data[j]);
                    if (v > max) max = v;
                }
            }
            peaks[i] = max;
        }

        // Normalize
        let globalMax = 0;
        for (let i = 0; i < peaks.length; i++) globalMax = Math.max(globalMax, peaks[i]);
        if (globalMax > 0) {
            for (let i = 0; i < peaks.length; i++) peaks[i] = peaks[i] / globalMax;
        }
        return peaks;
    };

    const buildWaveformFromBlob = async (blob: Blob) => {
        const arrayBuf = await blob.arrayBuffer();
        const ctx = getDecodeContext();
        // slice(0) prevents some browsers from treating the buffer as detached later
        const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
        waveformPeaksRef.current = computePeaks(audioBuf, 160);
    };

    const drawWaveform = (progress01: number) => {
        const canvas = canvasRef.current;
        const peaks = waveformPeaksRef.current;
        if (!canvas) return;

        const { w, h, dpr } = ensureCanvasSize(canvas);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(0,0,0,0.03)";
        ctx.fillRect(0, 0, w, h);

        if (!peaks) return;

        const barCount = peaks.length;
        const gap = Math.max(2 * dpr, 2);
        const barW = (w - gap * (barCount - 1)) / barCount;

        const mid = h / 2;

        // Base waveform (muted)
        ctx.fillStyle = "rgba(108,117,125,0.55)";
        for (let i = 0; i < barCount; i++) {
            const amp = peaks[i];
            const barH = Math.max(2 * dpr, amp * h);
            const x = i * (barW + gap);
            const y = mid - barH / 2;
            ctx.fillRect(x, y, barW, barH);
        }

        // Played overlay (blue)
        const playedBars = Math.floor(progress01 * barCount);
        ctx.fillStyle = "rgba(13,110,253,0.85)";
        for (let i = 0; i < playedBars; i++) {
            const amp = peaks[i];
            const barH = Math.max(2 * dpr, amp * h);
            const x = i * (barW + gap);
            const y = mid - barH / 2;
            ctx.fillRect(x, y, barW, barH);
        }

        // Playhead line
        const px = Math.min(w, Math.max(0, progress01 * w));
        ctx.fillStyle = "rgba(13,110,253,1)";
        ctx.fillRect(px, 0, Math.max(2 * dpr, 2), h);
    };

    const startPlayAnim = () => {
        stopPlayAnim();

        const tick = () => {
            const a = audioRef.current;
            if (!a || !a.duration || !isFinite(a.duration)) {
                drawWaveform(0);
                return;
            }

            const p = Math.min(1, Math.max(0, a.currentTime / a.duration));
            drawWaveform(p);

            if (!a.paused && !a.ended) {
                playRafRef.current = requestAnimationFrame(tick);
            } else {
                stopPlayAnim();
            }
        };

        playRafRef.current = requestAnimationFrame(tick);
    };

    // ---------- playback controls ----------
    const pause = () => {
        const a = audioRef.current;
        if (!a) return;
        a.pause();
        setPlaying(false);
    };

    const togglePlay = () => {
        const a = audioRef.current;
        if (!a || !current?.url || recording) return;

        if (a.paused) {
            a.play()
                .then(() => setPlaying(true))
                .catch(() => {
                    // user gesture should allow play; if blocked, ignore
                });
        } else {
            a.pause();
            setPlaying(false);
        }
    };

    const clear = async () => {
        pause();
        stopPlayAnim();

        const a = audioRef.current;
        if (a) {
            a.removeAttribute("src");
            a.load();
        }

        if (current?.url) URL.revokeObjectURL(current.url);

        waveformPeaksRef.current = null;
        setNext(null);
        setError(null);
        setElapsed(0);

        drawEmpty();
    };

    // ---------- record controls ----------
    const start = async () => {
        if (disabled) return;

        setError(null);
        pause();
        stopPlayAnim();

        if (typeof window === "undefined") return;
        if (!navigator.mediaDevices?.getUserMedia) {
            const msg = "Audio recording not supported in this browser.";
            setError(msg);
            onError?.(msg);
            return;
        }
        if (typeof MediaRecorder === "undefined") {
            const msg = "MediaRecorder API not available in this browser.";
            setError(msg);
            onError?.(msg);
            return;
        }

        // clear any previous recording first
        if (current) await clear();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Start live bars immediately
            await startRecordingVisualizer(stream);
            startTimer();

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            recorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const mt = recorder.mimeType || "audio/webm";
                const blob = new Blob(chunksRef.current, { type: mt });
                const url = URL.createObjectURL(blob);

                // Stop mic & live visualizer
                stopTimer();
                stopStream();
                await stopRecordingVisualizer();

                // Build waveform for playback and set audio src
                await buildWaveformFromBlob(blob);
                drawWaveform(0);

                const a = audioRef.current;
                if (a) {
                    a.src = url;
                    a.load();
                }

                setNext({ blob, url, mimeType: mt });
            };

            recorder.start();
            setRecording(true);
            setPlaying(false);
        } catch (err) {
            stopTimer();
            stopStream();
            await stopRecordingVisualizer();
            drawEmpty();

            const msg =
                err instanceof Error ? err.message : "Microphone permission denied or not available.";
            setError(msg);
            onError?.(msg);
        }
    };

    const stop = () => {
        const r = recorderRef.current;
        if (!r) return;
        if (r.state !== "inactive") r.stop();
        setRecording(false);
    };

    // Sync hidden audio src if parent controls value
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;

        if (current?.url) {
            a.src = current.url;
            a.load();

            // If a controlled value appears (e.g. restored), try to build waveform
            // only if we don't already have peaks.
            if (!waveformPeaksRef.current) {
                // Best-effort: cannot rebuild waveform without blob; controlled value includes blob in our type,
                // so if parent passes it, we can compute peaks.
                void buildWaveformFromBlob(current.blob).then(() => drawWaveform(0));
            } else {
                drawWaveform(0);
            }
        } else {
            a.removeAttribute("src");
            a.load();
            setPlaying(false);
            waveformPeaksRef.current = null;
            drawEmpty();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current?.url]);

    // audio events for play state + playhead animation
    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;

        const onEnded = () => {
            setPlaying(false);
            stopPlayAnim();
            drawWaveform(1);
        };

        const onPause = () => {
            setPlaying(false);
            stopPlayAnim();
            if (a.duration) drawWaveform(a.currentTime / a.duration);
        };

        const onPlay = () => {
            setPlaying(true);
            startPlayAnim();
        };

        a.addEventListener("ended", onEnded);
        a.addEventListener("pause", onPause);
        a.addEventListener("play", onPlay);

        return () => {
            a.removeEventListener("ended", onEnded);
            a.removeEventListener("pause", onPause);
            a.removeEventListener("play", onPlay);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initial draw
    useEffect(() => {
        drawEmpty();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            stopTimer();
            stopStream();
            stopPlayAnim();
            stopRecAnim();
            void stopRecordingVisualizer();

            if (current?.url) URL.revokeObjectURL(current.url);

            // Close decode context (optional; safe to leave open, but we’ll close to be tidy)
            decodeCtxRef.current?.close().catch(() => { });
            decodeCtxRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            start,
            stop,
            clear,
            togglePlay,
            pause,
            getValue: () => current,
            getBlob: () => current?.blob ?? null,
            isRecording: () => recording,
            isPlaying: () => playing,
        }),
        [current, recording, playing]
    );

    const hasAudio = !!current?.url;

    // Note: "audio player visible hidden" – keep audio in DOM, visually hidden
    return (
        <div className={className}>
            <audio
                ref={audioRef}
                controls={false}
                aria-hidden="true"
                style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: "hidden",
                    clip: "rect(0,0,0,0)",
                    whiteSpace: "nowrap",
                    border: 0,
                }}
            />

            {/* Waveform container (fixed width), with playhead moving left->right based on duration */}
            <div className='audioBox'
                style={{
                    height: 38,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    background: disabled ? "#f8f9fa" : "white",
                    opacity: disabled ? 0.75 : 1,
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        height: '100%',
                        width: '100%',
                        borderRadius: 4,
                        display: "block",
                    }}
                />
            </div>

            {/* Controls row below, in place */}
            <div className="d-flex align-items-center gap-2 mt-2">
                {/* Record / Stop */}
                {!recording ? (
                    <Button
                        type="button"
                        variant="sunlight"
                        disabled={!!disabled || playing} // prevent starting a recording mid-play
                        onClick={start}
                        className="d-flex align-items-center gap-2"
                    >
                        <FaMicrophone />
                        <span className="text-nowrap">Record</span>
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="sunlight"
                        disabled={!!disabled}
                        onClick={stop}
                        className="d-flex align-items-center gap-2"
                    >
                        <FaStop />
                        <span className="text-nowrap">Stop</span>
                    </Button>
                )}

                {/* Listen / Pause */}
                <Button
                    type="button"
                    variant={playing ? "bark" : "outline-bark"}
                    disabled={!!disabled || !hasAudio || recording}
                    onClick={togglePlay}
                    className="d-flex align-items-center gap-2"
                >
                    {playing ? <FaPause /> : <FaPlay />}
                    <span className="text-nowrap">{playing ? "Pause" : "Listen"}</span>
                </Button>

                {/* Clear */}
                <Button
                    type="button"
                    variant="outline-danger"
                    disabled={!!disabled || !hasAudio || recording}
                    onClick={() => void clear()}
                    className="d-flex align-items-center gap-2"
                >
                    <FaTrash />
                    <span className="text-nowrap">Clear</span>
                </Button>

                {/* Right-side status */}
                <div className="ms-auto small text-muted">
                    {recording ? `Recording ${formatTime(elapsed)}` : hasAudio ? (playing ? "Playing" : "Ready") : "—"}
                </div>
            </div>

            {error && <div className="text-danger small mt-2">{error}</div>}
        </div>
    );
});
