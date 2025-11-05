import { sep, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReadStream } from 'node:fs'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto' //, getHashes
import { createServer } from 'vite'
import puppeteer, { ElementHandle, Page, type Browser } from 'puppeteer'
import looksSame, { type LooksSameResult } from 'looks-same'

// console.log(`hashes:`, getHashes())

// process.exit(1)

const rePathSepEnd = sep === '\\' ? /[\\]+$/ : /[\/]+$/

const __dirname = fileURLToPath(new URL('..', import.meta.url)).replace(rePathSepEnd, '')

const __dirTest = fileURLToPath(new URL('.', import.meta.url)).replace(rePathSepEnd, '')

const __dirScreenshots = resolve(__dirTest, './__screenshots__')

const treePage = await getPage('TreePage', 'test/browser.html')

const logger = getLogger()

logger.log(`process started with __dirname: ${__dirname}`)

// logger.log(`pages:`, {
// 	testPageDemo,
// 	testPageShopify,
// 	testPageHeyHarper,
// })

if (process.argv.includes('--accept')) {
	await acceptPageScreenshots(treePage)
	process.exit(0)
}

const serverPort = 7357
const server = await createServer({
	// any valid user config options, plus `mode` and `configFile`
	configFile: false,
	root: __dirname,
	server: {
		port: serverPort,
	},
})
logger.log(`server created at port ${serverPort}`)

await server.listen()
server.printUrls()
server.bindCLIShortcuts({ print: true })
logger.log(`server listening`)

if (!process.argv.includes('--only-server')) {

	const browser = await puppeteer.launch()
	logger.log(`browser launched`)

	await testPage(browser, treePage)

	await browser.close()
	logger.log(`browser closed`)
	await server.close()
	logger.log(`server closed`)

	const errors = [
		treePage,
	].filter(testPage => testPage.screenErrors.length)

	if (errors.length) {
		errors.forEach(testPage => {
			logger.log(`errors found in ${testPage.path}`, testPage.screenErrors)
			Object.entries(testPage.screenDiff).forEach(([key, value]) => {
				if (value) logger.log(`- diff ${key}`, value)
			})
			// logger.log(testPage.screenDiff)
		})
		// logger.log(`errors found`, errors.map(testPage => ({
		// 	path: testPage.path,
		// 	errors: testPage.screenErrors,
		// 	diff: testPage.screenDiff,
		// })))
		process.exit(1)
	} else {
		logger.log(`no errors found`)
		process.exit(0)
	}

}
// */

function getLogger() {
	let index = 0
	return {
		log(...args: any[]) {
			console.log(`${++index}/`, ...args)
		},
		error(...args: any[]) {
			console.error(`${++index}/`, ...args)
		},
	}
}

function hashFile(filePath: string): Promise<{
	sha256: string | undefined,
}> {
	return new Promise((resolve, reject) => {
		// const hashMd5 = createHash('md5')
		// const hashSha1 = createHash('sha1')
		const hashSha256 = createHash('sha256')
		const stream = createReadStream(filePath)
		// let digestMd5 = undefined
		// let digestSha1 = undefined
		let digestSha256: string | undefined = undefined
		stream.on('readable', () => {
			const data = stream.read()
			if (data) {
				// hashMd5.update(data)
				// hashSha1.update(data)
				hashSha256.update(data)
			} else {
				// digestMd5 = hashMd5.digest('hex')
				// digestSha1 = hashSha1.digest('hex')
				digestSha256 = hashSha256.digest('hex')
			}
		})
		stream.on('end', () => resolve({
			// md5: digestMd5,
			// sha1: digestSha1,
			sha256: digestSha256,
		}))
		stream.on('error', error => {
			if ((error as any).code === 'ENOENT') {
				resolve({
					sha256: undefined,
				})
			} else {
				reject(error)
			}
		})
	})
}

function getScreenPath(slug: string, variant?: string | undefined) {
	return `${__dirScreenshots}${sep}s-${slug}${variant ? `-${variant}` : ''}.png`
}

function waitForTimeout(page: Page, ms: number) {
	return page.waitForFunction(() => new Promise(resolve => setTimeout(resolve, ms)))
}

// function getScreenPathGroup(slug, subVariant = '') {
// 	return {
// 		sClosed: getScreenPath(slug, `closed${subVariant}`),
// 		//`${__dirTest}${sep}s-${slug}-closed.png`,
// 		sOpened: getScreenPath(slug, `opened${subVariant}`),
// 		//`${__dirTest}${sep}s-${slug}-opened.png`,
// 		sReplied: getScreenPath(slug, `replied${subVariant}`),
// 		//`${__dirTest}${sep}s-${slug}-replied.png`,
// 	}
// }

const screenStepList = ['sInitial', 'sHover', 'sExpanded', 'sCondensed', 'sSelected'] as const

type ScreenStepKey = typeof screenStepList[number]

type ScreenStepMap<T> = {
	[key in ScreenStepKey]: T
}

type ScreenStepMapPath = ScreenStepMap<string>

type ScreenStepMapHash = ScreenStepMap<{
	sha256: string | undefined,
} | undefined>

type ScreenStepDiffResult = ScreenStepMap<
	Omit<LooksSameResult, 'diffImage'> | undefined
>

async function getPage(name: string, path: string) {
	const slug = name.toLowerCase().replace(/\W+/g, '-')

	const screenPathsSaved: ScreenStepMapPath = {
		sInitial: getScreenPath(slug),
		sHover: getScreenPath(slug, 'hover'),
		sExpanded: getScreenPath(slug, 'expanded'),
		sCondensed: getScreenPath(slug, 'condensed'),
		sSelected: getScreenPath(slug, 'selected'),
	}

	const screenPathsNew: ScreenStepMapPath = {
		sInitial: getScreenPath(slug, '-new'),
		sHover: getScreenPath(slug, 'hover-new'),
		sExpanded: getScreenPath(slug, 'expanded-new'),
		sCondensed: getScreenPath(slug, 'condensed-new'),
		sSelected: getScreenPath(slug, 'selected-new'),
	}

	const screenPathsDiff: ScreenStepMapPath = {
		sInitial: getScreenPath(slug, '-diff'),
		sHover: getScreenPath(slug, 'hover-diff'),
		sExpanded: getScreenPath(slug, 'expanded-diff'),
		sCondensed: getScreenPath(slug, 'condensed-diff'),
		sSelected: getScreenPath(slug, 'selected-diff'),
	}

	const screenHashesSaved: ScreenStepMapHash = {
		sInitial: await hashFile(screenPathsSaved.sInitial),
		sHover: await hashFile(screenPathsSaved.sHover),
		sExpanded: await hashFile(screenPathsSaved.sExpanded),
		sCondensed: await hashFile(screenPathsSaved.sCondensed),
		sSelected: await hashFile(screenPathsSaved.sSelected),
	}

	const screenHashesNew: ScreenStepMapHash = {
		sInitial: undefined,
		sHover: undefined,
		sExpanded: undefined,
		sCondensed: undefined,
		sSelected: undefined,
	}

	const screenErrors: any[] = []

	const screenDiff: ScreenStepDiffResult = {
		sInitial: undefined,
		sHover: undefined,
		sExpanded: undefined,
		sCondensed: undefined,
		sSelected: undefined,
	}

	return {
		name,
		slug,
		path,
		screenPathsSaved,
		screenPathsNew,
		screenPathsDiff,
		screenHashesSaved,
		screenHashesNew,
		screenErrors,
		screenDiff,
	}
}

type TestPage = Awaited<ReturnType<typeof getPage>>

async function compareHash(testPage: TestPage, sKey: ScreenStepKey, logger: ReturnType<typeof getLogger>, message: string) {
	if (testPage.screenHashesSaved[sKey]?.sha256 === testPage.screenHashesNew[sKey]?.sha256) {
		logger.log(`${testPage.path}: ${message} is the same as before`)
	} else if (testPage.screenHashesSaved[sKey]?.sha256 === undefined) {
		logger.log(`${testPage.path}: ${message} is new`)
	} else {
		const {
			diffImage,
			// @ts-expect-error
			metaInfo, // discard
			...diffResultSrc
			// equal,
			// diffBounds,
			// diffClusters,
			// differentPixels,
			// totalPixels,
		} = await looksSame(
			testPage.screenPathsSaved[sKey],
			testPage.screenPathsNew[sKey],
			{
				strict: false,
				// tolerance: 2.5,
				ignoreAntialiasing: false,
				// antialiasingTolerance: 0,
				ignoreCaret: true,
				shouldCluster: true,
				clustersSize: 10,
				createDiffImage: true,
			},
		)
		const diffResult = {
			...diffResultSrc,
			differentPercent: diffResultSrc.differentPixels / diffResultSrc.totalPixels * 100,
		}
		testPage.screenDiff[sKey] = diffResult
		if (diffResult.equal) {
			logger.log(`${testPage.path}: hashes didn't match but looksSame found no differences for ${sKey}`, diffResult)
		// } else if (diffResult.differentPercent < 2) {
		// 	logger.log(`${testPage.path}: ${message} is slightly different from before !!`, diffResult)
		} else {
			if (diffResult.differentPercent >= 2) {
				testPage.screenErrors.push(sKey)
			}
			logger.log(`${testPage.path}: ${message} is ${diffResult.differentPercent.toFixed(2)}% different from before !!`, {
				...diffResult,
				saved: testPage.screenHashesSaved[sKey],
				savedPath: testPage.screenPathsSaved[sKey],
				new: testPage.screenHashesNew[sKey],
				newPath: testPage.screenPathsNew[sKey],
			})
			if (diffImage) {
				await diffImage.save(testPage.screenPathsDiff[sKey])
			} else {
				logger.error(`looksSame did not return diffImage for ${sKey} in ${testPage.path}`, diffResult)
			}
		}
	}
}

async function testState(testPage: TestPage, sKey: ScreenStepKey, label: string, page: any) {
	const screenPath = testPage.screenHashesSaved[sKey]?.sha256 === undefined
		? testPage.screenPathsSaved[sKey]
		: testPage.screenPathsNew[sKey]
	await page.screenshot({path: screenPath})
	logger.log(`screenshot taken (${testPage.name} ${label})`)

	testPage.screenHashesNew[sKey] = await hashFile(screenPath)
	await compareHash(testPage, sKey, logger, `screenshot (${testPage.name} ${label})`)
}

async function testPage(browser: Browser, testPage: TestPage) {

	const browserCtx = await browser.createBrowserContext()

	const page = await browserCtx.newPage()
	logger.log(`page created`)

	await page.setViewport({width: 800, height: 600})
	logger.log(`viewport set`)

	await page.goto(`http://localhost:${serverPort}/${testPage.path}`)
	logger.log(`<+> page loaded ${testPage.path}`)

	await testState(testPage, 'sInitial', 'initial', page)

	// Expand a group (click the 'Colors' summary)
	{
		let colorsSummary: ElementHandle<Element> | null = null
		try {
			colorsSummary = await page.waitForSelector('[data-tree-summary="Colors"]', { timeout: 2000 })
			if (colorsSummary) {
				await colorsSummary.click()
				await waitForTimeout(page, 300)
				await testState(testPage, 'sExpanded', 'expanded', page)
			} else {
				logger.log(`expand target not found, skipping sExpanded`)
			}
		} catch (e) {
			logger.error('error during expand step', e)
		} finally {
			colorsSummary?.dispose()
		}
	}

	// Hover over an item (e.g. 'Red') to capture hover state
	{
		let redElem: ElementHandle<Element> | null = null
		try {
			redElem = await page.waitForSelector('[data-tree-option="Red"]', { timeout: 2000 })
			if (redElem) {
				await redElem.hover()
				await waitForTimeout(page, 200)
				await testState(testPage, 'sHover', 'hover', page)
			} else {
				logger.log(`hover target not found, skipping sHover`)
			}
		} catch (e) {
			logger.error('error during hover step', e)
		} finally {
			redElem?.dispose()
		}
	}

	// Condense (collapse) the group by clicking the summary again
	{
		let colorsSummary2: ElementHandle<Element> | null = null
		try {
			colorsSummary2 = await page.waitForSelector('[data-tree-summary="Colors"]', { timeout: 2000 })
			if (colorsSummary2) {
				await colorsSummary2.click()
				await waitForTimeout(page, 300)
				await testState(testPage, 'sCondensed', 'condensed', page)
			}
		} catch (e) {
			logger.error('error during condense step', e)
		} finally {
			colorsSummary2?.dispose()
		}
	}

	// Re-open and select an item (e.g. 'Green')
	{
		let colorsSummary3: ElementHandle<Element> | null = null
		try {
			colorsSummary3 = await page.waitForSelector('[data-tree-summary="Colors"]', { timeout: 2000 })
			if (colorsSummary3) {
				await colorsSummary3.click()
				await waitForTimeout(page, 300)
				{
					let greenElem: ElementHandle<Element> | null = null
					try {
						greenElem = await page.waitForSelector('[data-tree-option="Green"]', { timeout: 2000 })
						if (greenElem) {
							await greenElem.click()
							await waitForTimeout(page, 200)
							await testState(testPage, 'sSelected', 'selected', page)
						} else {
							logger.log(`select target not found, skipping sSelected`)
						}
					} catch (e) {
						logger.error('error during selection step', e)
					} finally {
						greenElem?.dispose()
					}
				}
			} else {
				logger.log(`re-open target not found, skipping selection flow`)
			}
		} catch (e) {
			logger.error('error during selection step', e)
		} finally {
			colorsSummary3?.dispose()
		}
	}

	// logger.log(`wait 1000 ms for good measure`)
	// await new Promise(resolve => setTimeout(resolve, 1000))

	// try {
	// 	await page.click('img.z1ucbv5')
	// } catch (error) {
	// 	if (error.message === 'No element found for selector: img.z1ucbv5') {
	// 		logger.log(`no control button found, skipping click`)
	// 		await page.click('img.FlyButton_flyButtonIconClass__z1ucbv5')
	// 	}
	// }

	// logger.log(`wait 200 ms for webfonts to load`)
	// await new Promise(resolve => setTimeout(resolve, 200))

	// await testState(testPage, 'sOpened', 'opened', page)

	// logger.log(`wait 3 seconds to receive websocket events and resources to load`)
	// await new Promise(resolve => setTimeout(resolve, 3000))

	// await testState(testPage, 'sReplied', 'replied', page)

	await page.close()

	logger.log(`wait 500 ms after page close`)
	await new Promise(resolve => setTimeout(resolve, 500))

	await browserCtx.close()

	logger.log(`wait 500 ms after browser context close`)
	await new Promise(resolve => setTimeout(resolve, 500))
}

async function acceptPageScreenshots(testPage: TestPage) {
	for (const key of screenStepList) {
		await acceptStateScreenshots(testPage, key as ScreenStepKey)
	}
}

async function acceptStateScreenshots(testPage: TestPage, sKey: ScreenStepKey) {
	const fileOpt = {}
	await readFile(
		testPage.screenPathsNew[sKey],
		fileOpt,
	).then(content => writeFile(
		testPage.screenPathsSaved[sKey],
		content,
		fileOpt,
	))
	await unlink(testPage.screenPathsNew[sKey])
	try {
		await unlink(testPage.screenPathsDiff[sKey])
	} catch (e) {
		if ((e as any).code === 'ENOENT') {
			// file does not exist, ignore
		} else {
			throw e
		}
	}
}
