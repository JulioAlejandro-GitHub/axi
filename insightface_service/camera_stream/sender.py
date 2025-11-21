# camera_stream/sender.py
import requests
import logging
from io import BytesIO


class Sender:
    def __init__(self, cfg):
        self.url = cfg.get('recognition_url')
        self.timeout = cfg.get('timeout', 10)


    def send_frame(self, jpeg_bytes, camera):
        try:
            files = {'file': ('frame.jpg', BytesIO(jpeg_bytes), 'image/jpeg')}
            data = {'camera_id': camera.get('camara_id'), 'camera_name': camera.get('nombre')}
            resp = requests.post(self.url, files=files, data=data, timeout=self.timeout)
            resp.raise_for_status()
            logging.info('Frame sent to backend: %s, status=%s', self.url, resp.status_code)
        except Exception as e:
            logging.exception('Error sending frame to backend: %s', e)