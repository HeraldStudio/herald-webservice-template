exports.route = { 
    /**
     * @api {GET} /param 获取 Get 请求参数
     * @apiGroup 参数获取
     * @apiDescription 获取 Get 请求参数的例子
     * 
     * @apiParam {String} param1 参数1
     * @apiParam {String} param2 参数2
     * 
     * @apiSuccess {String} param1 参数1
     * @apiSuccess {String} param2 参数2
     * 
     */
    async get({param1, param2}) { 
        // 这里举例如何读取用户请求参数
        // GET 请求的参数来自于 URL 携带的 Query
        return {param1, param2}
    },

    /**
     * @api {POST} /param 获取 Post 请求参数
     * @apiGroup 参数获取
     * @apiDescription 获取 Post 请求参数的例子
     * 
     * @apiParam {Any} param1 参数1
     * @apiParam {Any} param2 参数2
     * 
     * @apiSuccess {Any} param1 参数1
     * @apiSuccess {Any} param2 参数2
     * 
     */
    async post({param1, param2}) { 
        // 这里举例如何去读用户请求参数
        // POST 请求的参数来自于 Body
        return {param1, param2}
    },
    /**
     * @api {PUT} /param 获取 Put 请求参数
     * @apiGroup 参数获取
     * @apiDescription 获取 Put 请求参数的例子
     * 
     * @apiParam {Any} param1 参数1
     * @apiParam {Any} param2 参数2
     * 
     * @apiSuccess {Any} param1 参数1
     * @apiSuccess {Any} param2 参数2
     * 
     */
    async put({param1, param2}) { 
        // 这里举例如何去读用户请求参数
        // PUT 请求的参数来自于 Body
        return {param1, param2}
    },
    /**
     * @api {DELETE} /param 获取 Delete 请求参数
     * @apiGroup 参数获取
     * @apiDescription 获取 Delete 请求参数的例子
     * 
     * @apiParam {String} param1 参数1
     * @apiParam {String} param2 参数2
     * 
     * @apiSuccess {String} param1 参数1
     * @apiSuccess {String} param2 参数2
     * 
     */
    async delete({param1, param2}) { 
        // 这里举例如何读取用户请求参数
        // DELETE 请求的参数来自于 URL 携带的 Query
        return {param1, param2}
    },
}