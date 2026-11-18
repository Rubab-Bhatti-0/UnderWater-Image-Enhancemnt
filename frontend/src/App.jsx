import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine, ArrowRight, ChartNoAxesCombined, ChevronsLeftRight,
  Columns2, ImageIcon, ImagePlus, Layers3, LoaderCircle, RotateCcw,
  ScanLine, SlidersHorizontal, Sparkles, Waves,
} from 'lucide-react'

const DEFAULTS = { balance: 1, contrast: 2, gamma: 0.9, sharpen: 1 }
const SAMPLE = { file: null, name: 'baker-island.jpg' }
const stages = [
  { key: 'original', label: 'Original' },
  { key: 'balance', label: 'White balance' },
  { key: 'contrast', label: 'CLAHE' },
  { key: 'gamma', label: 'Gamma correction' },
  { key: 'enhanced', label: 'Enhanced' },
]
const controls = [
  {
    key: 'balance', label: 'White balance', detail: 'Neutralize the blue-green color cast.',
    min: 0, max: 1, step: 0.01, format: (value) => Math.round(value * 100) + '%',
  },
  {
    key: 'contrast', label: 'CLAHE clip limit', detail: 'Increase local luminance contrast.',
    min: 0, max: 5, step: 0.1, format: (value) => value.toFixed(1),
  },
  {
    key: 'gamma', label: 'Gamma', detail: 'Values below 1 brighten midtones.',
    min: 0.4, max: 2.5, step: 0.01, format: (value) => value.toFixed(2),
  },
  {
    key: 'sharpen', label: 'Sharpening', detail: 'Bring out edges and fine details.',
    min: 0, max: 2, step: 0.05, format: (value) => value.toFixed(2) + '×',
  },
]

function createForm(source, settings) {
  const form = new FormData()
  if (source.file) {
    form.set('image', source.file)
  } else {
    form.set('sample', '1')
  }
  for (const [key, value] of Object.entries(settings)) {
    form.set(key, String(value))
  }
  return form
}

async function requestResult(endpoint, source, settings, signal) {
  const response = await fetch(endpoint, {
    method: 'POST',
    body: createForm(source, settings),
    signal,
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}))
    throw new Error(problem.error || 'Reef Lab could not process the image. Try again.')
  }
  return response
}

function Comparison({ result, source, activeStage, busy }) {
  const [mode, setMode] = useState('split')
  const [position, setPosition] = useState(50)
  const original = result?.stages.original || (source === SAMPLE ? '/sample.jpg' : null)
  const processed = result?.stages[activeStage]
  const stageName = stages.find((stage) => stage.key === activeStage).label
  const isSplit = mode === 'split' && processed
  const isSide = mode === 'side' && processed

  return (
    <section className="panel comparison" aria-labelledby="comparison-title" aria-busy={busy}>
      <div className="comparison-heading">
        <div className="panel-heading">
          <ScanLine size={19} aria-hidden="true" />
          <h2 id="comparison-title">Image comparison</h2>
        </div>
        <div className="segmented" role="group" aria-label="Comparison layout">
          <button type="button" aria-pressed={mode === 'split'} onClick={() => setMode('split')}>
            <ChevronsLeftRight size={15} aria-hidden="true" />
            Split
          </button>
          <button type="button" aria-pressed={mode === 'side'} onClick={() => setMode('side')}>
            <Columns2 size={15} aria-hidden="true" />
            Side by side
          </button>
        </div>
      </div>
      <div
        className={['image-frame', source === SAMPLE ? 'sample-frame' : '', isSide ? 'side-view' : ''].join(' ')}
        style={{ '--split': position + '%' }}
      >
        {original ? (
          <>
            <div className={isSplit ? 'image-pane original-overlay' : 'image-pane'}>
              <img src={original} alt="Original underwater image" draggable={false} />
              {!isSplit && <span className="image-tag original-tag">Original</span>}
            </div>
            {processed && (
              <div className={isSplit ? 'image-pane processed-base' : 'image-pane'}>
                <img src={processed} alt={stageName + ' preview'} draggable={false} />
                <span className="image-tag processed-tag">{stageName}</span>
              </div>
            )}
            {isSplit && (
              <>
                <span className="image-tag original-tag">Original</span>
                <div className="split-divider" aria-hidden="true">
                  <span><ChevronsLeftRight size={20} /></span>
                </div>
                <input
                  type="range"
                  className="split-range"
                  min="0"
                  max="100"
                  value={position}
                  aria-label="Original image share"
                  aria-valuetext={position + '% original'}
                  onChange={(event) => setPosition(Number(event.target.value))}
                />
              </>
            )}
          </>
        ) : (
          <div className="frame-placeholder">
            {busy ? <LoaderCircle className="animate-spin" /> : <ImageIcon />}
            <span>{busy ? 'Processing image…' : 'Upload an image to compare'}</span>
          </div>
        )}
      </div>
      <div className="comparison-meta">
        <div className="file-info">
          <ImageIcon size={15} aria-hidden="true" />
          <span className="filename" title={source.name}>{source.name}</span>
          {result && <span className="dimensions">{result.width} × {result.height} px</span>}
        </div>
        {source === SAMPLE && (
          <a href="https://www.fws.gov/media/green-sea-turtle-swims-above-coral-reef-baker-islandcreditnoaajpg"
             target="_blank" rel="noreferrer" className="sample-credit">Sample photo · NOAA</a>
        )}
      </div>
    </section>
  )
}

function Adjustments({ settings, changeSettings, busy, apply, selectImage, useSample, dirty }) {
  const [dragging, setDragging] = useState(false)

  return (
    <section className="panel adjust" aria-labelledby="adjust-title">
      <div className="adjust-heading">
        <div className="panel-heading">
          <SlidersHorizontal size={18} aria-hidden="true" />
          <h2 id="adjust-title">Adjustments</h2>
        </div>
        <button className="text-button" onClick={() => changeSettings(DEFAULTS)}>
          <RotateCcw size={14} aria-hidden="true" /> Reset
        </button>
      </div>
      <div className="control-list">
        {controls.map(({ key, label, detail, min, max, step, format }) => (
          <div className="control" key={key}>
            <div className="control-label">
              <label htmlFor={key}>{label}</label>
              <output htmlFor={key}>{format(settings[key])}</output>
            </div>
            <input
              id={key}
              type="range"
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              aria-describedby={key + '-detail'}
              aria-valuetext={format(settings[key])}
              style={{ '--progress': ((settings[key] - min) / (max - min) * 100) + '%' }}
              onChange={(event) => changeSettings({ ...settings, [key]: Number(event.target.value) })}
            />
            <p id={key + '-detail'}>{detail}</p>
          </div>
        ))}
      </div>
      <button className="primary-button apply-button" onClick={apply} disabled={busy}>
        {busy ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />}
        {busy ? 'Processing…' : 'Apply enhancement'}
      </button>
      {dirty && !busy && <p className="pending-note" role="status">Apply to preview your changes.</p>}
      <div className="upload-wrap">
        <button
          className={'upload-zone' + (dragging ? ' dragging' : '')}
          onClick={selectImage}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            if (event.dataTransfer.files[0]) selectImage(event.dataTransfer.files[0])
          }}
        >
          <span className="upload-icon"><ImagePlus size={18} aria-hidden="true" /></span>
          <span><strong>Drop an image or browse</strong><small>JPG, PNG or WebP · up to 12 MB</small></span>
        </button>
        <button className="text-button sample-button" onClick={useSample}>
          Use sample image <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

function OutputDetails({ result, activeStage, selectStage }) {
  return (
    <div className="detail-grid">
      <section className="panel detail-panel" id="pipeline" aria-labelledby="pipeline-title">
        <div className="panel-heading">
          <Layers3 size={19} aria-hidden="true" />
          <h2 id="pipeline-title">Processing pipeline</h2>
        </div>
        <p className="section-note">Select a stage to compare its output with the original.</p>
        <div className="stage-grid" role="group" aria-label="Preview a processing stage">
          {stages.map(({ label, key }) => (
            <button
              className="stage"
              key={key}
              disabled={!result}
              aria-pressed={activeStage === key}
              onClick={() => selectStage(key)}
            >
              <span className="stage-thumbnail">
                {result ? <img src={result.stages[key]} alt="" /> : <ImageIcon aria-hidden="true" />}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel detail-panel histogram" aria-labelledby="histogram-title">
        <div className="panel-heading">
          <ChartNoAxesCombined size={19} aria-hidden="true" />
          <h2 id="histogram-title">RGB histograms</h2>
        </div>
        <p className="section-note">Original and enhanced on the same scale.</p>
        <div className="legend" aria-hidden="true">
          <span><i className="red" />Red</span>
          <span><i className="green" />Green</span>
          <span><i className="blue" />Blue</span>
        </div>
        {result ? (
          <img className="histogram-plot" src={result.histogram}
               alt="Two RGB histograms, original and enhanced, showing pixel percentage by intensity from 0 to 255." />
        ) : (
          <p className="section-note">Process an image to see its histograms.</p>
        )}
      </section>
    </div>
  )
}

export default function App() {
  const [source, setSource] = useState(SAMPLE)
  const [settings, setSettings] = useState(DEFAULTS)
  const [result, setResult] = useState(null)
  const [activeStage, setActiveStage] = useState('enhanced')
  const [busy, setBusy] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [problem, setProblem] = useState('')
  const input = useRef(null)
  const request = useRef(null)
  const dirty = result && Object.keys(DEFAULTS).some((key) => settings[key] !== result.settings[key])

  async function processImage(nextSource, nextSettings) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setProblem('')
    try {
      const response = await requestResult('/api/enhance', nextSource, nextSettings, controller.signal)
      const payload = await response.json()
      if (!controller.signal.aborted) {
        setResult({ ...payload, source: nextSource, settings: nextSettings })
        setActiveStage('enhanced')
      }
    } catch (error) {
      if (!controller.signal.aborted) setProblem(error.message)
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  useEffect(() => {
    processImage(SAMPLE, DEFAULTS)
    return () => request.current?.abort()
  }, [])

  function chooseFile(file) {
    if (!file) return
    if (file.size > 12 * 1024 * 1024) {
      setProblem('Please choose an image up to 12 MB.')
      return
    }
    changeSource({ file, name: file.name })
  }

  function changeSource(nextSource) {
    setSource(nextSource)
    setResult(null)
    processImage(nextSource, settings)
  }

  async function download() {
    if (!result || downloading) return
    setDownloading(true)
    setProblem('')
    try {
      const response = await requestResult('/api/download', result.source, result.settings)
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = result.source.name.replace(/\.[^.]+$/, '') + '-enhanced.png'
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setProblem(error.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <a className="brand" href="#" aria-label="Reef Lab home">
            <span className="brand-icon"><Waves size={22} strokeWidth={2.2} aria-hidden="true" /></span>
            Reef<span>Lab</span>
          </a>
          <nav className="top-actions" aria-label="Workspace">
            <a className="nav-link" href="#pipeline"><Layers3 size={16} aria-hidden="true" /> Pipeline</a>
            <button className="outline-button" onClick={() => input.current.click()}>
              <ImagePlus size={17} aria-hidden="true" /> Upload image
            </button>
          </nav>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            hidden
            onChange={(event) => {
              chooseFile(event.target.files[0])
              event.target.value = ''
            }}
          />
        </div>
      </header>

      <main className="shell">
        <div className="hero">
          <div>
            <h1>Underwater Image <span>Enhancement</span></h1>
            <p>Correct color cast, improve contrast, and inspect each stage of the OpenCV pipeline.</p>
          </div>
          <button className="outline-button download-button" onClick={download} disabled={!result || busy || downloading}>
            {downloading ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowDownToLine size={17} />}
            {downloading ? 'Preparing PNG…' : 'Download PNG'}
          </button>
        </div>

        {problem && <div className="error-message" role="alert">{problem}</div>}
        <div className="workspace-grid">
          <Comparison result={result} source={source} activeStage={activeStage} busy={busy} />
          <Adjustments
            settings={settings}
            changeSettings={setSettings}
            busy={busy}
            apply={() => processImage(source, settings)}
            selectImage={(file) => file instanceof File ? chooseFile(file) : input.current.click()}
            useSample={() => changeSource(SAMPLE)}
            dirty={dirty}
          />
        </div>

        <OutputDetails result={result} activeStage={activeStage} selectStage={setActiveStage} />
        <footer className="footer">
          <span>Reef Lab · Digital Image Processing</span>
          <span>Images are processed locally on your laptop.</span>
        </footer>
      </main>
    </>
  )
}
