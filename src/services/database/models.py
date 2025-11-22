# src/services/database/models.py
from sqlalchemy import (
    Table,
    Column,
    Integer,
    String,
    Enum,
    DateTime,
    JSON,
    ForeignKey,
    MetaData,
    Boolean,
    SmallInteger
)

metadata = MetaData()

# Definición de la tabla 'empresa'
empresa = Table(
    'empresa', metadata,
    Column('empresa_id', Integer, primary_key=True, autoincrement=True),
    Column('nombre', String(100), nullable=False),
    Column('estado', Enum('activo', 'inactivo'), nullable=False, default='inactivo')
)

# Definición de la tabla 'sucursal'
sucursal = Table(
    'sucursal', metadata,
    Column('local_id', Integer, primary_key=True, autoincrement=True),
    Column('empresa_id', Integer, ForeignKey('empresa.empresa_id'), nullable=False),
    Column('nombre', String(100), nullable=False),
    Column('estado', Enum('activo', 'inactivo'), nullable=False, default='inactivo')
)

# Definición de la tabla 'camara'
camara = Table(
    'camara', metadata,
    Column('camara_id', Integer, primary_key=True, autoincrement=True),
    Column('nombre', String(100), nullable=False),
    Column('ubicacion', Enum('Ingreso', 'Estadia', 'Salida'), nullable=False, default='Estadia'),
    Column('estado', Enum('Activo', 'Inactivo'), nullable=False, default='Activo'),
    Column('local_id', Integer, ForeignKey('sucursal.local_id', onupdate='CASCADE'), nullable=True),
    Column('orden', Integer, nullable=True),
    Column('protocolo', Enum('onvif', 'webcam'), nullable=False, default='onvif'),
    Column('camara_hostname', String(45), nullable=True),
    Column('camara_port', SmallInteger, nullable=True),
    Column('camara_user', String(50), nullable=True),
    Column('camara_pass', String(60), nullable=True)
)

# Definición de la tabla 'usuario'
usuario = Table(
    'usuario', metadata,
    Column('usuario_id', Integer, primary_key=True, autoincrement=True),
    Column('local_id', Integer, ForeignKey('sucursal.local_id', onupdate='CASCADE'), nullable=True),
    Column('nombre', String(100), nullable=False),
    Column('tipo', Enum('socio', 'empleado', 'familia', 'desconocido', 'ladron'), nullable=False, default='desconocido'),
    Column('email', String(200), nullable=False, unique=True),
    Column('estado', Enum('activo', 'inactivo'), nullable=False, default='inactivo'),
    Column('fecha_creacion', DateTime, nullable=False),
    Column('fecha_eliminacion', DateTime, nullable=True),
    Column('gender', Enum('male', 'female'), nullable=False, default='male'),
    Column('password_bcryptjs', String(200), nullable=False),
    Column('google', Boolean, nullable=False)
)

# Definición de la tabla 'acceso'
acceso = Table(
    'acceso', metadata,
    Column('acceso_id', Integer, primary_key=True, autoincrement=True),
    Column('usuario_id', Integer, ForeignKey('usuario.usuario_id', onupdate='CASCADE'), nullable=False),
    Column('camara_id', Integer, nullable=True),
    Column('fecha_acceso', DateTime, nullable=False),
    Column('tipo', Enum('visita', 'identificado', 'desconocido'), default='desconocido'),
    Column('estado', Enum('valido', 'por_validar', 'invalido'), default='por_validar'),
    Column('similarity', String(25), nullable=True),
    Column('perfil', Enum('front', 'left', 'right', 'top', 'undetected'), nullable=False, default='undetected'),
    Column('img', String(100), nullable=True),
    Column('embedding', JSON, nullable=True),
    Column('fecha_eliminacion', DateTime, nullable=True),
    Column('mesh', JSON, nullable=True),
    Column('img_compreface', String(40), nullable=True)
)

# Definición de la tabla 'login'
login = Table(
    'login', metadata,
    Column('login_id', Integer, primary_key=True, autoincrement=True),
    Column('usuario_id', Integer, ForeignKey('usuario.usuario_id', onupdate='CASCADE'), nullable=False),
    Column('fecha_login', DateTime, nullable=False),
    Column('tipo', Enum('socio', 'empleado', 'familia', 'desconocido', 'ladron'), nullable=False, default='desconocido')
)
