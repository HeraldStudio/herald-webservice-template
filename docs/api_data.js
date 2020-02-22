define({ "api": [
  {
    "type": "POST",
    "url": "/auth",
    "title": "",
    "group": "Auth",
    "name": "认证登录接口",
    "description": "<p>普遍情况下对接统一身份认证登录接口 如果是自维护用户登录需要修改逻辑</p>",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "ticket",
            "description": "<p>CAS 认证 ST-Ticket</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "service",
            "description": "<p>前端发起 CAS 认证的 Service</p>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "platform",
            "description": "<p>当前登录平台的标识符</p>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "Success 200": [
          {
            "group": "Success 200",
            "type": "String",
            "optional": false,
            "field": "-",
            "description": "<p>result 为 token 字符串</p>"
          }
        ]
      }
    },
    "error": {
      "fields": {
        "Error 500": [
          {
            "group": "Error 500",
            "optional": false,
            "field": "CAS_ERROR",
            "description": "<p>统一身份认证过程出错</p>"
          },
          {
            "group": "Error 500",
            "optional": false,
            "field": "IDENTITY_INVALID",
            "description": "<p>身份完整性校验失败</p>"
          }
        ]
      }
    },
    "version": "0.0.0",
    "filename": "middleware/auth.js",
    "groupTitle": "Auth"
  }
] });
