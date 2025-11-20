CREATE DATABASE `Vigilante` /*!40100 DEFAULT CHARACTER SET utf8 */;

CREATE TABLE `empresa` (
  `empresa_id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'inactivo',
  PRIMARY KEY (`empresa_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8;

CREATE TABLE `sucursal` (
  `local_id` int NOT NULL AUTO_INCREMENT,
  `empresa_id` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'inactivo',
  PRIMARY KEY (`local_id`),
  KEY `FK_sucursal_empresa` (`empresa_id`),
  CONSTRAINT `FK_sucursal_empresa` FOREIGN KEY (`empresa_id`) REFERENCES `empresa` (`empresa_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;

CREATE TABLE `camara` (
  `camara_id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `ubicacion` enum('Ingreso','Estadia','Salida') NOT NULL DEFAULT 'Estadia',
  `estado` enum('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  `local_id` int DEFAULT NULL,
  `orden` int DEFAULT NULL,
  `protocolo` enum('onvif','webcam') NOT NULL DEFAULT 'onvif',
  `camara_hostname` varchar(45) DEFAULT NULL,
  `camara_port` smallint DEFAULT NULL,
  `camara_user` varchar(50) DEFAULT NULL,
  `camara_pass` char(60) DEFAULT NULL,
  PRIMARY KEY (`camara_id`),
  KEY `fk_local_camara` (`local_id`),
  CONSTRAINT `fk_local_camara` FOREIGN KEY (`local_id`) REFERENCES `sucursal` (`local_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb3;

CREATE TABLE `usuario` (
  `usuario_id` int NOT NULL AUTO_INCREMENT,
  `local_id` int DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('socio','empleado','familia','desconocido','ladron') NOT NULL DEFAULT 'desconocido',
  `email` varchar(200) NOT NULL,
  `estado` enum('activo','inactivo') NOT NULL DEFAULT 'inactivo',
  `fecha_creacion` datetime NOT NULL,
  `fecha_eliminacion` datetime DEFAULT NULL,
  `gender` enum('male','female') NOT NULL DEFAULT 'male',
  `password_bcryptjs` varchar(200) NOT NULL,
  `google` tinyint(1) NOT NULL,
  PRIMARY KEY (`usuario_id`),
  UNIQUE KEY `uq_email` (`email`),
  KEY `FK_local_usuario` (`local_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_tipo` (`tipo`),
  CONSTRAINT `FK_local_usuario` FOREIGN KEY (`local_id`) REFERENCES `sucursal` (`local_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=161 DEFAULT CHARSET=utf8mb3;

CREATE TABLE `acceso` (
  `acceso_id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `camara_id` int DEFAULT NULL,
  `fecha_acceso` datetime NOT NULL,
  `tipo` enum('visita','identificado','desconocido') DEFAULT 'desconocido',
  `estado` enum('valido','por_validar','invalido') DEFAULT 'por_validar',
  `similarity` varchar(25) DEFAULT NULL,
  `perfil` enum('front','left','right','top','undetected') NOT NULL DEFAULT 'undetected',
  `img` varchar(100) DEFAULT NULL,
  `embedding` json DEFAULT NULL,
  `fecha_eliminacion` datetime DEFAULT NULL,
  `mesh` json DEFAULT NULL,
  `img_compreface` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`acceso_id`),
  KEY `FK_usuario_id_acceso` (`usuario_id`),
  KEY `fk_camara_id_acceso` (`camara_id`),
  CONSTRAINT `FK_usuario_id_acceso` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`usuario_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=367 DEFAULT CHARSET=utf8mb3;

CREATE TABLE `login` (
  `login_id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `fecha_login` datetime NOT NULL,
  `tipo` enum('socio','empleado','familia','desconocido','ladron') NOT NULL DEFAULT 'desconocido',
  PRIMARY KEY (`login_id`),
  KEY `FK_usuario_id_login` (`usuario_id`),
  CONSTRAINT `FK_usuario_id_login` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`usuario_id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=409 DEFAULT CHARSET=utf8mb3;



INSERT INTO Vigilante.empresa (nombre) VALUES
	 ('Test Vigilante');

INSERT INTO Vigilante.usuario (nombre,tipo,fecha_creacion,estado,fecha_eliminacion,email,password_bcryptjs,google,local_id) VALUES
	 ('Julio','familia','2024-09-03 14:42:49','activo',NULL,'juliomoralesgutierrez@gmail.com','$2a$10$/pRqJ8LTWbnnUirDNjz0TO2q.uysnXUUW/H7j8ZGOGDj46t54FwyO',0,1);


INSERT INTO Vigilante.camara (nombre,ubicacion,estado,local_id,orden) VALUES
	 ('entreda 1','Ingreso','Activo',1,1),
	 ('salida 1','Salida','Activo',1,6),
	 ('Ingreso 2','Ingreso','Activo',1,2),
	 ('Salida 7','Estadia','Activo',1,7),
	 ('Estadia 3','Estadia','Activo',1,3),
	 ('Estadia 4','Estadia','Activo',1,4),
	 ('Estadia 5','Estadia','Activo',1,5);