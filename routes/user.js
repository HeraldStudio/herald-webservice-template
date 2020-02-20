exports.route = {
  async get() {
    return { 
      name:this.user.name,
      cardnum:this.user.cardnum,
      schoolnum:this.user.schoolnum
    }
  }
}