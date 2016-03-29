{
    "webPort": 8000,
    "stunServer": "stun.sipnet.ru:3478",
    "webAccounts": [
        {
            "username": "admin",
            "password": "admin"
        },
        {
            "username": "user_XXXXXXXXXX"
        }
    ],
    "trustedNet": {
        "tokenURL": "https://net.trusted.ru/idp/sso/oauth/token",
        "profileURL": "https://net.trusted.ru/trustedapp/rest/person/profile/get",
        "redirect_uri": "/auth/trusted",
        "client_id": "TRUSTED_LOGIN_CLIENT_ID",
        "client_secret": "TRUSTED_LOGIN_CLIENT_SECRET"
    },
    "maxCalls": 10,
    "ringingTimeout": "30",
    "serviceName": "MARS",
    "activeAccount": 0,
    "def_tts": "yandex",
    "ivona_speech": {
        "accessKey": "XXX",
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
            "expires": 60,
            "user": "ghjghjg",
            "password": "ghjghj",
            "disable": 0,
            "domain": "multifon.ru"
        },
        {
            "host": "mangosip.ru",
            "expires": 60,
            "user": "dfgdfg",
            "password": "dfgdfg",
            "disable": 0
        },
        {
            "host": "193.201.229.35",
            "expires": 60,
            "user": "222",
            "password": "222",
            "domain": "multifon.ru",
            "disable": 0
        },
        {
            "host": "193.201.229.35",
            "expires": 60,
            "user": "ghjgh",
            "password": "ghjg",
            "domain": "multifon.ru",
            "disable": 1
        },
        {
            "host": "mangosip.ru",
            "expires": 60,
            "user": "ghj",
            "password": "ghjg",
            "disable": 1
        },
        {
            "host": "youmagic.pro",
            "expires": 60,
            "user": "fghgf",
            "password": "ghfgh",
            "disable": 1
        },
        {
            "host": "193.201.229.35",
            "expires": 60,
            "user": "fgh",
            "password": "fgh",
            "domain": "multifon.ru",
            "disable": 1
        },
        {
            "host": "youmagic.pro",
            "expires": 60,
            "user": "fghfg",
            "password": "fghf",
            "disable": 1
        }
    ],
    "levels": {
        "[all]": "trace",
        "http": "error"
    },
    "replaceConsole": "false",
    "appenders": [
        {
            "type": "console",
            "category": [
                "console",
                "server",
                "ua",
                "call",
                "task",
                "error",
                "http"
            ]
        },
        {
            "type": "file",
            "filename": "logs/error.log",
            "maxLogSize": 1048576,
            "backups": 3,
            "category": "error"
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
            "filename": "logs/task.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "task"
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