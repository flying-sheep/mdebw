import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

const entries = ['background', 'options', 'popup']

export default entries.map(entry => ({
	input: `src/main-${entry}.js`,
	output: {
		file: `build/${entry}.js`,
		format: 'iife',
	},
	plugins: [
		resolve(),
		commonjs(),
	],
	sourcemap: true,
}))
