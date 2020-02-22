exports.route = { 
    /**
     * 
     * 
     */
    async get({param1, param2}) { 
        // 这里举例如何读取用户请求参数
        // GET 请求的参数来自于 URL 携带的 Query
        return {param1, param2}
    },
    async post({param1, param2}) { 
        // 这里举例如何去读用户请求参数
        // POST 请求的参数来自于 Body
        return {param1, param2}
    },
    async put({param1, param2}) { 
        // 这里举例如何去读用户请求参数
        // PUT 请求的参数来自于 Body
        return {param1, param2}
    },
    async delete({param1, param2}) { 
        // 这里举例如何读取用户请求参数
        // DELETE 请求的参数来自于 URL 携带的 Query
        return {param1, param2}
    },
}