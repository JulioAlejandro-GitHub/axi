module.exports = {
    unknown_user: {
        enabled: true,
        subject: 'Alerta: Usuario Desconocido Detectado',
        methods: [
            // {
            //     type: 'email',
            //     recipients: ['juliomoralesgutierrez@gmail.com'],
            //     template: `
            //         <h1>Alerta de Intrusión</h1>
            //         <p>Se ha detectado un usuario desconocido en el sistema.</p>
            //         <ul>
            //             <li><strong>Cámara:</strong> {{camera}}</li>
            //             <li><strong>Ubicación:</strong> {{location}}</li>
            //             <li><strong>Fecha y Hora:</strong> {{timestamp}}</li>
            //             <li><strong>IP:</strong> {{ip}}</li>
            //         </ul>
            //         <p>Se adjunta una imagen del evento.</p>
            //         <img src="cid:intrusion_image" alt="Imagen de intrusión"/>
            //     `
            // },
            // {
            //     type: 'sms',
            //     recipients: ['+1234567890'], // Placeholder for phone numbers
            //     template: 'Alerta de Intrusión: Usuario desconocido detectado en la cámara {{camera}} en {{location}} a las {{timestamp}}.'
            // },
            {
                type: 'telegram',
                recipients: ['8090057437'], // Placeholder for chat IDs
                template: '<b>Alerta de Intrusión</b>\nUsuario desconocido detectado en la cámara {{camera}} en {{location}} a las {{timestamp}}.'
            },
            // {
            //     type: 'whatsapp',
            //     recipients: ['+1234567890'], // Placeholder for phone numbers
            //     template: 'Alerta de Intrusión: Usuario desconocido detectado en la cámara {{camera}} en {{location}} a las {{timestamp}}.'
            // }
        ]
    },
    thief_detected: {
        enabled: true,
        subject: 'Alerta de Seguridad: Ladrón Detectado',
        methods: [
            // {
            //     type: 'email',
            //     recipients: ['admin@vigilante-ia.com', 'security@vigilante-ia.com'],
            //     template: `
            //         <h1>Alerta de Seguridad Crítica</h1>
            //         <p>Se ha detectado a un individuo clasificado como "ladrón".</p>
            //         <ul>
            //             <li><strong>Nombre:</strong> {{name}}</li>
            //             <li><strong>Cámara:</strong> {{camera}}</li>
            //             <li><strong>Ubicación:</strong> {{location}}</li>
            //             <li><strong>Fecha y Hora:</strong> {{timestamp}}</li>
            //             <li><strong>IP:</strong> {{ip}}</li>
            //         </ul>
            //         <p>Se adjunta una imagen del individuo.</p>
            //         <img src="cid:intrusion_image" alt="Imagen de intrusión"/>
            //     `
            // },
            // {
            //     type: 'sms',
            //     recipients: ['+1234567890'], // Placeholder for phone numbers
            //     template: 'Alerta de Seguridad Crítica: Ladrón detectado. Nombre: {{name}}, Cámara: {{camera}}, Ubicación: {{location}}, Hora: {{timestamp}}.'
            // },
            {
                type: 'telegram',
                recipients: ['8090057437'], // Placeholder for chat IDs
                template: '<b>Alerta de Seguridad Crítica</b>\nLadrón detectado.\n<b>Nombre:</b> {{name}}\n<b>Cámara:</b> {{camera}}\n<b>Ubicación:</b> {{location}}\n<b>Hora:</b> {{timestamp}}'
            },
            // {
            //     type: 'whatsapp',
            //     recipients: ['+1234567890'], // Placeholder for phone numbers
            //     template: 'Alerta de Seguridad Crítica: Ladrón detectado. Nombre: {{name}}, Cámara: {{camera}}, Ubicación: {{location}}, Hora: {{timestamp}}.'
            // }
        ]
    },
    new_user_detected: {
        enabled: false, // Disabled by default, can be enabled by admins
        subject: 'Información: Nuevo Usuario Detectado',
        methods: [
            {
                type: 'email',
                recipients: ['admin@vigilante-ia.com'],
                template: `
                    <h1>Nuevo Usuario Detectado</h1>
                    <p>Un nuevo usuario ha sido detectado y está pendiente de clasificación.</p>
                    <ul>
                        <li><strong>Cámara:</strong> {{camera}}</li>
                        <li><strong>Ubicación:</strong> {{location}}</li>
                        <li><strong>Fecha y Hora:</strong> {{timestamp}}</li>
                    </ul>
                `
            },
            {
                type: 'sms',
                recipients: ['+1234567890'], // Placeholder for phone numbers
                template: 'Nuevo usuario detectado en la cámara {{camera}} en {{location}} a las {{timestamp}}.'
            },
            {
                type: 'telegram',
                recipients: ['8090057437'], // Placeholder for chat IDs
                template: '<b>Nuevo Usuario Detectado</b>\nUn nuevo usuario ha sido detectado y está pendiente de clasificación.\n<b>Cámara:</b> {{camera}}\n<b>Ubicación:</b> {{location}}\n<b>Hora:</b> {{timestamp}}'
            },
            {
                type: 'whatsapp',
                recipients: ['+1234567890'], // Placeholder for phone numbers
                template: 'Nuevo usuario detectado en la cámara {{camera}} en {{location}} a las {{timestamp}}.'
            },
            {
                type: 'push',
                template: 'Nuevo usuario detectado en la cámara {{camera}} en {{location}} a las {{timestamp}}.'
            }
        ]
    }
};
