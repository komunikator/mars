{
    "sipPort": 0,
    "webPort": 8000,
    "stunServer": "stun.sipnet.ru:3478",
    "webAccounts": [
        {
            "id": 1,
            "username": "admin",
            "password": "admin",
            "email": "admin@example.com"
        }
    ],
    "maxCalls": 10,
    "ringingTimeout": "30",
    "serviceName": "MARS",
    "activeAccount": 0,
    "def_tts": "ivona",
    "ivona_speech": {
        "accessKey": "XXXXXXXXX",
        "secretKey": "XXXXXXXXX",
        "language": "ru-RU",
        "name": "Tatyana",
        "gender": "Female"
    },
    "recognize": {
        "type": "yandex",
        "options": {
            "developer_key": "XXXXXXXXX",
            "model": "general"
        }
    },
    "sipAccounts": [
        {
            "host": "193.201.229.35",
            "domain": "multifon.ru",
            "expires": 60,
            "password": "XXXXXXXXX",
            "user": "XXXXXXXXX",
            "disable": 0
        }
    ],
    "logLevel": {
        "server": "DEBUG",
        "call": "DEBUG",
        "sip": "DEBUG",
        "http": "ERROR",
        "ua": "ERROR"
    },
    "appenders": [
        {
            "type": "console",
            "category_": [
                "softphone"
            ],
            "category": [
                "server",
                "ua",
                "call",
                "company",
                "remoteClient"
            ]
        },
        {
            "type": "file",
            "filename": "logs/server.log",
            "maxLogSize": 1048576,
            "backups": 3,
            "category": "server"
        },
        {
            "type": "file",
            "filename": "logs/ua.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "ua"
        },
        {
            "type": "file",
            "filename": "logs/sip.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "sip"
        },
        {
            "type": "file",
            "filename": "logs/call.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "call"
        },
        {
            "type": "file",
            "filename": "logs/remoteClient.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "remoteClient"
        },
        {
            "type": "file",
            "filename": "logs/company.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "company"
        },
        {
            "type": "file",
            "filename": "logs/http.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "http"
        },
        {
            "type": "file",
            "filename": "logs/cdr.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "cdr"
        },
        {
            "type": "file",
            "filename": "logs/softphone.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "softphone"
        }
    ]
}