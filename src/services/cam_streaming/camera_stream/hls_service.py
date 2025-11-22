import os
import subprocess
import logging
from pathlib import Path


def build_rtsp_url(camera: dict) -> str:
    """
    Construye la URL RTSP a partir de los campos de la cámara.
    """
    return (
        f"rtsp://{camera.get('camara_user')}:{camera.get('camara_pass')}"
        f"@{camera.get('camara_hostname')}:{camera.get('camara_port')}"
        "/cam/realmonitor?channel=1&subtype=0"
    )


def start_hls_stream(camera: dict, output_root: str, segment_time: int = 2):
    """
    Inicia un proceso ffmpeg que publica HLS para la cámara dada.
    Devuelve el proceso y la ruta al index.m3u8 generado.
    """
    rtsp_url = build_rtsp_url(camera)
    cam_id = camera.get("camara_id", "unknown")
    out_dir = Path(output_root) / f"cam_{cam_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    playlist = out_dir / "index.m3u8"

    cmd = [
        "ffmpeg",
        "-rtsp_transport", "tcp",
        "-i", rtsp_url,
        "-c:v", "copy",
        "-f", "hls",
        "-hls_time", str(segment_time),
        "-hls_list_size", "5",
        "-hls_flags", "delete_segments",
        str(playlist),
    ]

    logging.info("[HLS] Iniciando stream cam_id=%s -> %s", cam_id, playlist)
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    return proc, str(playlist)
