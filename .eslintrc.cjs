module.exports = {
	env: {
		commonjs: true,
		es2021: true,
		node: true
	},
	extends: 'eslint:recommended',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module'
	},
	rules: {
		'no-var': 2,
		'space-infix-ops': 2,
		'no-trailing-spaces': 2,
		'no-whitespace-before-property': 2,
		'no-empty-function': ['error', { allow: ['constructors'] }],
		'no-multi-spaces': 2,
		'eqeqeq': 2,
		'no-dupe-args': 2,
		'no-dupe-keys': 2,
		'no-eval': 2,
		'no-self-compare': 2,
		'no-self-assign': 2,
		'no-const-assign': 2,
		'no-func-assign': 2,
		'no-mixed-spaces-and-tabs': 0
	}
};
