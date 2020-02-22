/**
  # 用户身份认证中间件

  ## 身份认证流程
  保持完整的前后端分离特性，同时提供灵活性。
  1. webservice 接受来自前端的 ticket 和 service，和 ids 服务器换取用户的「一卡通号」
  2. 依次从 T_BZKS 、T_YJS 、T_JZG_JBXX 表中根据一卡通号查询记录，进行完整性校验
  3. 生成 token 下发给用户，将 tokenHash = SHA256(token) 插入 XSC_AUTH

  ## 鉴权流程
  1. 从请求头中获取 x-api-token 字段
  2. 计算 tokenHash 并从数据库中查找记录
  3. 向下层提供信息
  
  ## 依赖接口

  ctx.params          from params.js
  ctx.get             from axios.js

  ## 暴露接口

  ctx.user.isLogin    boolean             仅已登录用户带 token 请求时有效，否则为 false
  ctx.user.tokenHash  string?             登录设备唯一识别码。若同一个用户多处登录，该识别码不相同
  ctx.user.cardnum    string?             用户一卡通号码
  ctx.user.name       string?             用户姓名
  ctx.user.schoolnum  string?             用户学号（教师为空）
  ctx.user.platform   string?             用户登录时使用的平台识别符
  
  注：

  以上接口除 isLogin 外，其他属性一旦被获取，将对用户进行鉴权，不允许游客使用；因此，若要定义用户和游客
  均可使用的功能，需要先通过 isLogin 区分用户和游客，然后对用户按需获取其他属性，不能对游客获取用户属性，
  否则将抛出 401。
 */

const crypto = require('crypto')
const xmlparser = require('fast-xml-parser')
const axios = require('axios')
const { config } = require('../app')
const authConfig = require('../sdk/sdk.json').auth

const tokenHashPool = {} // 用于缓存tokenHash，防止高峰期数据库爆炸💥

// 对称加密算法，要求 value 是 String 或 Buffer，否则会报错
const encrypt = (value) => {
  try {
    let cipheriv = crypto.createCipheriv(config.auth.cipher, authConfig.key, authConfig.iv)
    let result = cipheriv.update(value, 'utf8', 'hex')
    result += cipheriv.final('hex')
    return result
  } catch (e) {
    console.log(e)
    return ''
  }
}

// 对称解密算法，要求 value 是 String 或 Buffer，否则会报错
const decrypt = (value) => {
  try {
    let decipheriv = crypto.createDecipheriv(config.auth.cipher, authConfig.key, authConfig.iv)
    let result = decipheriv.update(value, 'hex', 'utf8')
    result += decipheriv.final('utf8')
    return result
  } catch (e) {
    console.log(e)
    return ''
  }
}

// 哈希算法，用于对 token 进行摘要
const hash = value => {
  return Buffer.from(crypto.createHash('sha256').update(value).digest()).toString('hex')
}


module.exports = async (ctx, next) => {

  /**
   * @api {POST} /auth 认证登录
   * @apiGroup 认证登录
   * @apiName Auth
   * @apiDescription
   * 普遍情况下对接统一身份认证登录接口
   * 如果是自维护用户登录需要修改逻辑
   * 
   * @apiParam {String} ticket CAS 认证 ST-Ticket
   * @apiParam {String} service 前端发起 CAS 认证的 Service
   * @apiParam {String} platform 当前登录平台的标识符
   * 
   * @apiSuccess {String} - result 为 token 字符串
   * 
   * @apiError (Error 500) CAS_ERROR 统一身份认证过程出错
   * @apiError (Error 500) IDENTITY_INVALID 身份完整性校验失败
   */
  // 对于 auth 路由的请求，直接截获，不交给 kf-router
  if (ctx.path === '/auth') {

    // POST /auth 登录认证
    if (ctx.method.toUpperCase() !== 'POST') {
      throw 405
    }

    let { ticket, service, platform } = ctx.params


    if (typeof ticket !== 'string'
      || typeof service !== 'string') {
      throw 405
    }

    if (!platform) {
      throw 405
    } else if (!/^[0-9a-z-]+$/.test(platform)) {
      throw 405
    }

    // 该服务接入两种验证服务，由于公众号入口可能性大，先尝试cas-we-can验证
    let cardnum, openid, fromWechat = 0
    let casWeCanRes = '', idsRes = ''
    try {
      try {
        // 从 cas-we-can 获取信息
        const casWeCanUrl = `https://xgbxscwx.seu.edu.cn/cas-we-can/serviceValidate?ticket=${ticket}&service=${service}&json=1`
        const res = await axios.get(casWeCanUrl)
        const data = res.data
        casWeCanRes = data
        cardnum = data.cas_info.cardnum
        openid = data.openid
        fromWechat = 1
      } catch (e) {
        // 从IDS获取一卡通号
        const serviceValidateURL = `https://newids.seu.edu.cn/authserver/serviceValidate?service=${service}&ticket=${ticket}`
        const res = await axios.get(serviceValidateURL)
        const data = xmlparser.parse(res.data.toString())['cas:serviceResponse']['cas:authenticationSuccess']['cas:attributes']
        idsRes = xmlparser.parse(res.data.toString())
        cardnum = '' + data['cas:uid']
      }
    } catch (e) {
      console.log(e)
      console.log(casWeCanRes, idsRes)
      throw {
        status: 500,
        error:'CAS_ERROR',
        reason:'统一身份认证过程出错'
      }
    }

    // 从数据库查找学号、姓名
    let name, schoolnum
    if (cardnum.startsWith('21')) {
      // 本科生库
      const record = await ctx.db.execute(
        `SELECT XM, XJH FROM T_BZKS_TMP
        WHERE XH=:cardnum`, [cardnum]
      )
      if (record.rows.length > 0) {
        name = record.rows[0][0]
        schoolnum = record.rows[0][1]
      }
    } else if (cardnum.startsWith('10')) {
      // 教职工库
      const record = await ctx.db.execute(
        `SELECT XM FROM T_JZG_JBXX_TMP
        WHERE ZGH=:cardnum`, [cardnum]
      )
      if (record.rows.length > 0) {
        name = record.rows[0][0]
      }
    }

    if (!name) {
      throw {
        status: 500,
        error:'IDENTITY_INVALID',
        reason:'身份完整性校验失败'
      }
    }

    // 生成 32 字节 token 转为十六进制，及其哈希值
    let token = Buffer.from(crypto.randomBytes(20)).toString('hex')
    let tokenHash = hash(token)

    // 将新用户信息插入数据库
    let now = moment()

    // 向数据库插入记录
    await ctx.db.execute(
      `INSERT INTO XSC_AUTH 
      (TOKEN_HASH, CARDNUM, REAL_NAME, CREATED_TIME, PLATFORM, LAST_INVOKED_TIME, SCHOOLNUM, FROM_WECHAT)
      VALUES (:tokenHash, :cardnum, :name, :createdTime, :platform, :lastInvokedTime, :schoolnum, :fromWechat )
      `,
      {
        tokenHash,
        cardnum,
        name,
        createdTime: now.toDate(),
        lastInvokedTime: now.toDate(),
        schoolnum,
        platform,
        fromWechat
      }
    )
    if (openid) {
      try {
        // 如果有 OpenID 则一并存储
        await ctx.db.execute(/*sql*/`INSERT INTO XSC_OPENID (
          CARDNUM, OPENID
        ) VALUES ( :cardnum, :openid )`,
        { cardnum, openid })
      } catch (e) {
        // 不允许重复插入
      }
    }

    ctx.body = token
    ctx.logMsg = `${name} [${cardnum}] - 身份认证成功 - 登录平台 ${platform}`
    return

  } else if (ctx.request.headers['x-api-token']) {
    let token
    // 对于来自其他平台的其他请求，根据 token 的哈希值取出表项
    token = ctx.request.headers['x-api-token']
    let tokenHash = hash(token)
    // 第一步查内存缓存
    let record = tokenHashPool[tokenHash]

    if (!record) {
      // 缓存没有命中
      record = await ctx.db.execute(`
      SELECT CARDNUM, REAL_NAME, CREATED_TIME, LAST_INVOKED_TIME, SCHOOLNUM, PLATFORM, FROM_WECHAT
      FROM XSC_AUTH
      WHERE TOKEN_HASH=:tokenHash`,
      { tokenHash }
      )
      if (record.rows.length > 0) {
        // 数据库找到啦
        record = {
          cardnum: record.rows[0][0],
          name: record.rows[0][1],
          createdTime: moment(record.rows[0][2]).unix(),
          lastInvokedTime: moment(record.rows[0][3]).unix(),
          schoolnum: record.rows[0][4],
          platform: record.rows[0][5],
          fromWechat: record.rows[0][6]
        }
        tokenHashPool[tokenHash] = record
      } else {
        record = null
      }
    }

    if (record) {
      let now = moment()
      let lastInvokedTime = record.lastInvokedTime
      // 每 4 小时更新一次用户上次调用时间
      if (now - lastInvokedTime >= 4 * 60 * 60 * 1000) {
        await ctx.db.execute(`
          UPDATE XSC_AUTH
          SET LAST_INVOKED_TIME = :now
          WHERE TOKEN_HASH = :tokenHash`
        , { now: now.toDate(), tokenHash })
        record.lastInvokedTime = now.unix()
      }

      let {
        cardnum, name, schoolnum, platform, fromWechat
      } = record

      // 将用户信息暴露给下层中间件
      ctx.user = {
        isLogin: true,
        token: tokenHash,
        cardnum, name, schoolnum, platform, encrypt, decrypt, fromWechat
      }

      // 调用下游中间件
      await next()
      return
    }

  }


  /* eslint getter-return:off */
  // 对于没有 token 或 token 失效的请求，若下游中间件要求取 user，说明功能需要登录，抛出 401
  let reject = () => { throw 401 }
  ctx.user = {
    isLogin: false,
    get cardnum() { reject() },
    get name() { reject() },
    get schoolnum() { reject() },
    get platform() { reject() },
    get encrypt() { reject() },
    get decrypt() { reject() },
    get fromWechat() { reject() },
  }

  // 调用下游中间件
  await next()
}
