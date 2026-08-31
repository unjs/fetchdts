import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['test/fixture/generated*.ts'],
})
  .append({
    files: ['playground/**'],
    rules: {
      'antfu/no-top-level-await': 'off',
    },
  })
