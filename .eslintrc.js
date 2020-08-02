module.exports = {
  parser: 'babel-eslint',

  extends: ['airbnb', 'prettier'],

  plugins: ['prettier'],

  env: {
    node: true,
  },

  rules: {
    'no-console': [
      'error',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],

    // Ignore Mongo's `_id`
    'no-underscore-dangle': ['error', { allow: ['_id'] }],

    // "Prefer default export" can be annoying when setting up modules that will later scale to more than one export
    'import/prefer-default-export': 'off',

    // Prefer destructuring from arrays and objects
    // http://eslint.org/docs/rules/prefer-destructuring
    'prefer-destructuring': [
      'error',
      {
        VariableDeclarator: {
          array: false,
          object: true,
        },
        AssignmentExpression: {
          array: false,
          object: false,
        },
      },
      {
        enforceForRenamedProperties: false,
      },
    ],

    // ESLint plugin for prettier formatting
    // https://github.com/prettier/eslint-plugin-prettier
    'prettier/prettier': 'error',

    // ADJUSTMENTS
    'no-unused-vars': ['warn', { args: 'none' }], // TODO: fix these and make this rule 'error'
    radix: ['warn'],
  },

  settings: {
    // Allow absolute paths in imports, e.g. import Button from 'components/Button'
    // https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules', 'src'],
      },
    },
  },
}
