const HTMLWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = {
    // sourcce file location
    entry: {
        abstract: path.resolve(__dirname, "src", "js", "main.js"),
        //이런식으로 추가하면 된다 파일 이름을. 그러면 dist 폴더에 concrete.js 가 만들어진다. 위의 경우 abstract.js이 만들어진다. 
        exploration: path.resolve(__dirname, "src", "js", "Exploration.js"),        
        //concrete: path.resolve(__dirname, "src", "concrete.js")
    },
    mode: "development",
    target: "web",
    output: {
        path: path.resolve(__dirname, "src", "js", "dist"),
        filename: '[name].js'
    },
   
    plugins: [new HTMLWebpackPlugin({})],
};