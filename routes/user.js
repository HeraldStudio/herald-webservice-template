exports.route = {
  async get() {
    // 这里展示如何读取用户基本信息
    return { 
      name:this.user.name,
      cardnum:this.user.cardnum,
      schoolnum:this.user.schoolnum,
      isWeixin:this.user.isWeixin
    }
  }
}