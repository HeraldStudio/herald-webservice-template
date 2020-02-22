/**
  # 返回格式中间件

  按照一定的规则，规范返回格式，将 HTTP Status Code 下放到 JSON 中，使 HTTP Status Code 保持为 200。
 */
module.exports = async (ctx, next) => {

  // 不要使用这个对流程控制具有迷惑性的 API，请直接用 throw 代替
  ctx.throw = (code) => { throw code }

  try {
    await next()
  } catch (e) {
    ctx.body = ''
    if (!e) {
      ctx.status = 400
    } else if (typeof e === 'number') {
      ctx.status = e
    } else if (typeof e === 'string') {
      ctx.error = 'BAD_REQUEST'
      ctx.body = e
      ctx.logMsg = e
      ctx.status = 400
    } else if (e.error) {
      // 如果存在错误枚举值
      ctx.error = e.error
      ctx.body = e.reason
      ctx.status = e.status ? e.status : 400
    } else {
      console.trace(e)
      ctx.logMsg = e.name + ':' + e.message
      ctx.error = 'INTERNAL_SERVER_ERROR'
      ctx.body = `服务器内部错误（${e}）`
      ctx.status = 500
    }
  }

  let json = {}

  if (ctx.response.get('Location')) {
    ctx.status = 302
    return
  } else if (ctx.status < 400) {
    json = {
      success: true,
      code: ctx.status || 200,
      result: ctx.body,
      related: ctx._related
    }
  } else {
    json = {
      success: false,
      code: ctx.status || 200,
      reason: ctx.body,
      error: ctx.error,
      related: ctx._related
    }
    if (!ctx.body) {
      if (ctx.status === 400) {
        json.error = 'BAD_REQUEST'
        json.reason = '请求出错'
      } else if (ctx.status === 401) {
        json.reason =
          ctx.request.path === '/auth' ?
            '登录失败' : (ctx.request.headers.token ? '身份凭据失效' : '需要登录')
        json.error =
          ctx.request.path === '/auth' ?
            'AUTH_FAILED' : (ctx.request.headers.token ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED')
      } else if (ctx.status === 403) {
        json.error = 'FORBIDDEN'
        json.reason = '权限不允许'
      } else if (ctx.status === 404) {
        json.error = 'NOT_FOUND'
        json.reason = '内容不存在'
      } else if (ctx.status === 405) {
        json.error = 'BAD_REQUEST'
        json.reason = '调用方式不正确'
      } else if (ctx.status === 408) {
          json.error = 'REQUEST_TIMEOUT'
          json.reason = '请求超时'
      } else if (ctx.status === 500) {
        json.error = 'INTERNAL_SERVER_ERROR'
        json.reason = '服务器内部错误'
      } else if (ctx.status === 502) {
        json.error = ''
        json.reason = '服务器维护'
      } else {
        json.error = 'BAD_REQUEST'
        json.reason = '请求出错'
      }
    }
  }

  /**
   * @apiDefine Error401
   * @apiError UNAUTHORIZED 需要登录-接口需要登录才能调用
   * @apiError TOKEN_EXPIRED 身份凭证失效-请求携带了 Token 但是 Token 无效
   */
  if (ctx.wx) {
    if (!ctx.wechatTest) ctx.body = 'success'
    ctx.status = 200
  } else {
    ctx.body = json
    ctx.status = 200
  }
}
