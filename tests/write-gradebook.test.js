/* eslint-env jest */
const { default: mockFsControl, mock: fs } = require('jest-plugin-fs');
const writeGradebook = require('../src/write-gradebook');

jest.mock('fs', () => require('jest-plugin-fs/mock'));
jest.mock('../src/octokit', () => {
  const createFileMock = jest.fn(() => Promise.resolve());
  const mock = jest.fn(() => {
    return {
      repos: {
        createFile: createFileMock,
      },
    };
  });
  mock.__createFileMock = createFileMock;
  return mock;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFsControl.mock();
});

afterEach(() => {
  mockFsControl.restore();
});

const makeGradebook = (extra) => ({
  'nwalter2': {
    pct100: 70,
    errors: null,
    extraCredit: 2,
    ...extra,
  },
});

const makeCourseConfig = () => ({
  grades: {
    org: 'cs225',
    repo: 'grades_fa18',
  },
});

const makeOptions = (extra) => ({
  outputPath: '/',
  id: 'testing',
  graded: false,
  ...extra
});

describe('writeGradebook', () => {
  it('writes an empty gradebook', async () => {
    const gradebook = {};
    const courseConfig = makeCourseConfig();
    const options = makeOptions();

    await writeGradebook(gradebook, courseConfig, options);

    expect(fs.readFileSync('/testing.csv', 'utf8')).toEqual('netid,score,error,ec\n');
  });

  it('writes a gradebook without errors', async () => {
    const gradebook = makeGradebook();
    const courseConfig = makeCourseConfig();
    const options = makeOptions();

    await writeGradebook(gradebook, courseConfig, options);

    expect(fs.readFileSync('/testing.csv', 'utf8')).toEqual('netid,score,error,ec\nnwalter2,70,,2\n');
  });

  it('writes a gradebook with errors', async () => {
    const gradebook = makeGradebook({ errors: ['testing'] });
    const courseConfig = makeCourseConfig();
    const options = makeOptions();

    await writeGradebook(gradebook, courseConfig, options);

    expect(fs.readFileSync('/testing.csv', 'utf8')).toEqual('netid,score,error,ec\nnwalter2,70,"testing",2\n');
  });

  it('does not upload to GitHub if this is not a graded run', async () => {
    const gradebook = makeGradebook();
    const courseConfig = makeCourseConfig();
    const options = makeOptions();

    await writeGradebook(gradebook, courseConfig, options);

    const { __createFileMock } = require('../src/octokit');
    expect(__createFileMock).not.toBeCalled();
  });

  it('uploads to GitHub if this is a graded run', async () => {
    const gradebook = makeGradebook();
    const courseConfig = makeCourseConfig();
    const options = makeOptions({ graded: true });

    await writeGradebook(gradebook, courseConfig, options);

    const { __createFileMock } = require('../src/octokit');
    expect(__createFileMock).toBeCalled();
  });
});