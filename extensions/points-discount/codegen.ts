import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: ['src/*.graphql'],
  generates: {
    './generated/api.ts': {
      plugins: ['typescript', 'typescript-operations'],
    },
  },
}

export default config

