{
    "webPort": 8000,
    "audioCodec": "PCMU",
    "stunServer": "stun.sipnet.ru:3478",
    "dataStorageDays": 100,
    "bitrix24": {
        "portal_link": "",
        "client_id": "",
        "client_secret": "",
        "grant_type": "",
        "redirect_uri": ""
    },
    "repository": "https://raw.githubusercontent.com/komunikator/mars/master/package.json",
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
        "accessKey": "",
        "secretKey": "",
        "language": "ru-RU",
        "name": "Tatyana",
        "gender": "Female"
    },
    "recognize": {
        "type": "yandex",
        "options": {
            "developer_key": "",
            "model": "general"
        }
    },
    "sipAccounts": {
        "1": {
            "host": "127.0.0.1:5060",
            "expires": 60,
            "user": "1",
            "password": "1",
            "disable": 0,
            "type": "sip",
            "transport": "udp"
        },
        "2": {
            "host": "127.0.0.1:5060",
            "expires": 60,
            "user": "2",
            "password": "2",
            "disable": 0,
            "type": "sip",
            "transport": "udp"
        },
        "3": {
            "host": "127.0.0.1:5060",
            "expires": 60,
            "user": "3",
            "password": "3",
            "disable": 0,
            "type": "sip",
            "transport": "udp"
        },
        "5894475a0e5216d64426d524": {
            "host": "193.201.229.35",
            "expires": 60,
            "user": "xxxxxxxx",
            "password": "xxxxxxxx",
            "domain": "multifon.ru",
            "disable": 1,
            "type": "sip",
            "transport": "udp"
        }
    },
    "b24accounts": {
        "test1": {
            "disable": 1,
            "clientId": "APP_CLIENT_ID",
            "clientSecret": "APP_CLIENT_SECRET",
            "portalLink": "LINK_MY_PORTAL_BITRIX24",
            "redirectUri": "MY_DOMAIN:PORT"
        }
    },
    "SMPP": {
        "SMPP_server_1": {
            "host": "0.0.0.0",
            "port": 80,
            "connection_type": "trx",
            "System_ID": "xxxx",
            "password": "yyyy",
            "sms_send_limit": 5,
            "disable": 1
        }
    },
    "SMPP_connections": {
        "connect_1": {
            "input": "number1",
            "output": "number2",
            "smpp_out": "SMPP_server_1",
            "disable": 1
        }
    },
    "levels": {
        "[all]": "trace",
        "http": "error",
        "smsc": "trace"
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
                "http",
                "rotation",
                "sip_proxy",
                "smsc",
                "sms"
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
            "filename": "logs/rotation.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "rotation"
        },
        {
            "type": "file",
            "filename": "logs/sip_proxy.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "sip_proxy"
        },
        {
            "type": "file",
            "filename": "logs/smsc.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "smsc"
        },
        {
            "type": "file",
            "filename": "logs/sms.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "sms"
        },
        {
            "type": "file",
            "filename": "logs/smpp.log",
            "maxLogSize": 1048576,
            "backups": 10,
            "category": "smpp"
        }
    ],
    "sipServer": {
        "udp": {
            "port": 5060
        },
        "tcp": {
            "port": 5061
        },
        "ws": {
            "port": 8506
        },
        "accounts": [
            {
                "user": "1",
                "password": "1"
            },
            {
                "user": "2",
                "password": "2"
            },
            {
                "user": "3",
                "password": "3"
            },
            {
                "user": "4",
                "password": "4"
            },
            {
                "user": "5",
                "password": "5"
            },
            {
                "user": "6",
                "password": "6"
            },
            {
                "user": "7",
                "password": "7"
            },
            {
                "user": "8",
                "password": "8"
            },
            {
                "user": "9",
                "password": "9"
            }
        ]
    }
}