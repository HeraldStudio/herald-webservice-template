exports.route = { 
    async get() { 
        // 这里举例如何抛出错误
        throw {
            error:'EXAMPLE_ERROR', // 错误类型的枚举值，预留给前端逻辑判断使用
            status: 520, // 这个状态码会成为 code，使用 http 标准错误码
            reason: '这里的提示语应该适合直接展示给用户'
        }
    }
}