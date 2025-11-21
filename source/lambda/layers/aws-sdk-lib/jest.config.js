module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverageFrom: ['*.ts', '!*.test.ts', '!jest.config.js'],
    coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
    moduleNameMapper: {
        '^aws-node-user-agent-config$': '<rootDir>/../aws-node-user-agent-config/dist'
    }
};
