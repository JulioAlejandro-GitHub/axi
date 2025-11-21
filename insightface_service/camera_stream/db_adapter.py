# camera_stream/db_adapter.py
# Implementa aquí las funciones equivalentes a BD_GetOnvifCameras, BDupdCamara, BD_sel_Webcam


async def BD_GetOnvifCameras():
# return list of camera dicts
raise NotImplementedError('Implement DB access')


async def BDupdCamara(payload):
# payload: { camara_id, estado, local_id }
raise NotImplementedError('Implement DB access')


async def BD_sel_Webcam(params):
# return rows similar a tu función JS
raise NotImplementedError('Implement DB access')