module.exports = `import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'

const src  = path.resolve(__dirname, 'src')
const dist = path.resolve(__dirname, 'dist')

export default {
  mode: 'development',
  context: src,
  entry: src + '/index.jsx',
  output: {
    path: dist,
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.jsx$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: src + '/index.html',
      filename: 'index.html'
    })
  ],
  devServer: {
    contentBase: dist,
    port: 8000,
    hot: true,
    open: true,
  },
}`;
