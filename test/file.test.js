/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2019 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/

/* eslint-env mocha */

'use strict';

const assert = require('assert');
const fs = require('fs-extra');
const nock = require('nock');
const { downloadFile, uploadFile } = require('../lib/file');

describe('file', function() {
    describe('download', function() {
        afterEach(async function() {
            nock.cleanAll()
            try {
                await fs.unlink('.testfile.dat');
            } catch (e) {
                // don't fail if the file doesn't exist, it's only done to clean up 
                // after ourselves
            }
        })
        it('status-200', async function() {
            nock('http://test-status-200')
                .get('/path/to/file.ext')
                .reply(200, 'hello world');
    
            await downloadFile('http://test-status-200/path/to/file.ext', '.testfile.dat');
            const result = await fs.readFile('.testfile.dat', 'utf8');
            assert.strictEqual(result, 'hello world');
        })
        it('status-200-mkdir', async function() {
            nock('http://test-status-200')
                .get('/path/to/file.ext')
                .reply(200, 'hello world');
    
            await downloadFile('http://test-status-200/path/to/file.ext', '.testdir/.testfile.dat', {
                mkdirs: true
            });
            const result = await fs.readFile('.testdir/.testfile.dat', 'utf8');
            assert.strictEqual(result, 'hello world');
            await fs.unlink('.testdir/.testfile.dat');
            await fs.rmdir('.testdir');
        })
        it('status-404', async function() {
            try {
                nock('http://test-status-404')
                    .get('/path/to/file.ext')
                    .reply(404, 'hello world');
        
                await downloadFile('http://test-status-404/path/to/file.ext', '.testfile.dat');
            } catch (e) {
                assert.strictEqual(e.message, 'Download \'http://test-status-404/path/to/file.ext\' failed with status 404');
                const result = await fs.readFile('.testfile.dat', 'utf8');
                assert.strictEqual(result, '');
            }
        })
    })
    describe('upload', function() {
        beforeEach(async function() {
            await fs.writeFile('.testfile.dat', 'hello world 123', 'utf8');
        })
        afterEach(async function() {
            nock.cleanAll()
            try {
                await fs.unlink('.testfile.dat');
            } catch (e) {
                // don't fail if the file doesn't exist, it's only done to clean up 
                // after ourselves
            }
        })
        it('status-201', async function() {
            nock('http://test-status-201')
                .matchHeader('content-length', 15)
                .put('/path/to/file.ext', 'hello world 123')
                .reply(201);
    
            await uploadFile('.testfile.dat', 'http://test-status-201/path/to/file.ext');
        })
        it('status-404', async function() {
            nock('http://test-status-404')
                .put('/path/to/file.ext', 'hello world 123')
                .reply(404);
    
            try {
                await uploadFile('.testfile.dat', 'http://test-status-404/path/to/file.ext');
                assert.fail('failure expected')
            } catch (e) {
                assert.strictEqual(e.message, 'Upload to \'http://test-status-404/path/to/file.ext\' failed with status 404');
            }
        })
    })
})