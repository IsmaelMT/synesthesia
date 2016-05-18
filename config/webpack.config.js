import Webpack from "webpack"
import path from "path"

let nodeModulesPath = path.resolve(__dirname, 'node_modules');
let buildPath = path.resolve(__dirname, 'public', 'build');
let mainPath = path.resolve(__dirname, '..', 'src', 'app.js');

let config = {

    // Makes sure errors in console map to the correct file
    // and line number
    devtool: 'eval',
    
    entry: [
        // For hot style updates
        'webpack/hot/dev-server',

        // The script refreshing the browser on none hot updates
        'webpack-dev-server/client?http://localhost:8080',

        // Our application
        mainPath
    ],
    output: {

        // We need to give Webpack a path. It does not actually need it,
        // because files are kept in memory in webpack-dev-server, but an
        // error will occur if nothing is specified. We use the buildPath
        // as that points to where the files will eventually be bundled
        // in production
        path: buildPath,
        filename: 'bundle.js',

        // Everything related to Webpack should go through a build path,
        // localhost:3000/build. That makes proxying easier to handle
        publicPath: '/build/'
    },

    resolve: {
        modulesDirectories: ['src','node_modules','local_modules'],
        extensions: ['', '.js'],
        alias: {
            "kinect": path.join(__dirname, "..", "libs", "kinect", "Kinect-1.8.0.js"),
            "kinect_worker": path.join(__dirname, "..", "libs", "kinect", "KinectWorker-1.8.0.js"),
            "osc-browser": path.join(__dirname, "..", "libs", "osc", "osc-browser.js")
        }
    },


    module: {

        // allow local glslify/browserify config to work
        postLoaders: [
            {
                test: /\.js$/,
                loader: 'ify'
            }
        ],
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel',
                exclude: /node_modules/,
                
                query: {
                    cacheDirectory: true,
                    // presets: ['babel-preset-es2015']
                }
            },
            {
                test: /\.json$/,
                loader: 'json'
            },
            {
                test: /node_modules/,
                loader: 'ify'
            },
            {
                test: /\.css$/,
                loader: "style-loader!css-loader"
            },
            {
                test: /\.(jpg|jpeg|gif|png)$/,
                exclude: /node_modules/,
                loader:'url-loader?limit=100000'
            },
            {
                test: /\.(woff|woff2|eot|ttf|svg)$/,
                exclude: /node_modules/,
                loader: 'url-loader?limit=100000'
            },
	        {
	            test:  path.join(__dirname, "..", "libs", "kinect", "Kinect-1.8.0.js"),
	            loader: "exports?Kinect=window.Kinect&KinectUI=window.KinectUI"
	        },
    	    {
	            test:  path.join(__dirname, "..", "libs", "kinect", "KinectWorker-1.8.0.js"),
	            loader: "script"
	        },
            {
	            test:  path.join(__dirname, "..", "libs", "osc", "osc-browser.js"),
	            loader: "script"
	        }
        ],
     },

    // We have to manually add the Hot Replacement plugin when running
    // from Node
    plugins: [new Webpack.HotModuleReplacementPlugin()]
};

module.exports = config;
