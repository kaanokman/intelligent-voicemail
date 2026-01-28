import WaveSurfer from "wavesurfer.js";
import { useEffect, useRef } from "react";

export default function AudioWave({ url }: { url: string }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        const ws = WaveSurfer.create({
            container: ref.current,
            waveColor: "#ccc",
            progressColor: "#28030f",
            height: 64,
        });

        ws.load(url);
        return () => ws.destroy();
    }, [url]);

    return <div ref={ref} />;
}
