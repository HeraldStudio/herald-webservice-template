exports.route = {
  async get() {
    // 这里展示如何读取用户基本信息
    /**
     * @api {GET} /user 获取用户信息示例
     * @apiGroup 用户信息
     * @apiDescription 获取用户信息的例子
     * 
     * @apiSuccess {String} name 用户姓名
     * @apiSuccess {String} cardnum 用户一卡通号
     * @apiSuccess {String} schoolnum 用户学号
     * @apiSuccess {Boolean} isWeixin 用户是否从微信网页授权认证登录
     * 
     * @apiUse Error401
     */
    return { 
      name:this.user.name,
      cardnum:this.user.cardnum,
      schoolnum:this.user.schoolnum,
      isWeixin:this.user.isWeixin
    }
  }
}