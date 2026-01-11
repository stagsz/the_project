import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'

export default function Tooltip({ content, children, position = 'bottom-left' }) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)

  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const tooltipWidth = 288 // w-72 = 18rem = 288px

      // Position below the button, aligned to the left but ensure it stays in viewport
      let left = rect.left
      const top = rect.bottom + 8

      // Ensure tooltip doesn't go off the right edge
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = window.innerWidth - tooltipWidth - 16
      }

      // Ensure tooltip doesn't go off the left edge
      if (left < 16) {
        left = 16
      }

      setTooltipPos({ top, left })
    }
  }, [isVisible])

  const tooltipContent = isVisible && (
    <div
      className="fixed z-[9999] w-72 pointer-events-none"
      role="tooltip"
      style={{
        top: `${tooltipPos.top}px`,
        left: `${tooltipPos.left}px`,
      }}
    >
      <div className="bg-gray-900 text-white text-sm rounded-lg p-3 shadow-xl border border-gray-600">
        <div className="space-y-2">
          {content}
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative inline-flex items-center">
      {children}
      <button
        ref={buttonRef}
        type="button"
        className="ml-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label="More information"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
    </div>
  )
}

// Pre-defined tooltip content for training parameters
export const TRAINING_TOOLTIPS = {
  model: {
    title: 'Model Selection',
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Selects which machine learning model to train across your federated network.</p>
        <p className="font-medium mt-2">Impact:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Different models have different architectures and purposes</li>
          <li>Model type determines what kind of predictions it can make</li>
          <li>Each training round creates a new version of the selected model</li>
        </ul>
      </div>
    )
  },

  targetDevices: {
    title: 'Target Devices',
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Specifies which edge devices participate in this training round.</p>
        <p className="font-medium mt-2">Impact:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>More devices</strong> = Better generalization, longer training time</li>
          <li><strong>Fewer devices</strong> = Faster training, but may overfit to specific data</li>
          <li>Leave empty to automatically use all online devices</li>
        </ul>
      </div>
    )
  },

  learningRate: {
    title: 'Learning Rate',
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Controls how much the model adjusts its weights based on each batch of data.</p>
        <p className="font-medium mt-2">Typical values: 0.001 - 0.1</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Higher (0.1)</strong> = Faster learning, risk of overshooting optimal values</li>
          <li><strong>Lower (0.001)</strong> = More stable, but slower convergence</li>
          <li><strong>Recommended:</strong> Start with 0.01 and adjust based on results</li>
        </ul>
      </div>
    )
  },

  batchSize: {
    title: 'Batch Size',
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Number of samples processed before updating model weights.</p>
        <p className="font-medium mt-2">Typical values: 16, 32, 64, 128</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Larger (64+)</strong> = More stable gradients, needs more memory</li>
          <li><strong>Smaller (16-32)</strong> = More noise, better generalization, less memory</li>
          <li><strong>For edge devices:</strong> 32 is usually a good balance</li>
        </ul>
      </div>
    )
  },

  localEpochs: {
    title: 'Local Epochs',
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Number of complete passes through the local dataset on each device before sending updates.</p>
        <p className="font-medium mt-2">Typical values: 1 - 10</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>More epochs (5-10)</strong> = Better local learning, but may diverge from global model</li>
          <li><strong>Fewer epochs (1-2)</strong> = More communication overhead, but better convergence</li>
          <li><strong>Recommended:</strong> 5 epochs for balanced performance</li>
        </ul>
      </div>
    )
  },

  epsilon: {
    title: 'Epsilon (Privacy Budget)',
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Controls the privacy-utility tradeoff in differential privacy. Lower = more private.</p>
        <p className="font-medium mt-2">Typical values: 0.1 - 10</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Low (0.1-1)</strong> = Strong privacy, but reduced model accuracy</li>
          <li><strong>Medium (1-5)</strong> = Good balance of privacy and utility</li>
          <li><strong>High (5-10)</strong> = Better accuracy, weaker privacy guarantees</li>
        </ul>
        <p className="text-xs mt-2 text-amber-300">Note: Epsilon accumulates across training rounds!</p>
      </div>
    )
  },

  delta: {
    title: 'Delta',
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Probability that the privacy guarantee fails. Should be very small.</p>
        <p className="font-medium mt-2">Typical values: 1e-5 to 1e-7</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Should be smaller than 1/N where N is dataset size</li>
          <li><strong>1e-5 (0.00001)</strong> = Standard for most applications</li>
          <li><strong>1e-7</strong> = Extra protection for sensitive data</li>
        </ul>
      </div>
    )
  },

  noiseMultiplier: {
    title: 'Noise Multiplier',
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Amount of Gaussian noise added to gradients for privacy protection.</p>
        <p className="font-medium mt-2">Typical values: 0.5 - 2.0</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Higher (1.5+)</strong> = More privacy, noisier gradients, slower learning</li>
          <li><strong>Lower (0.5-1)</strong> = Less noise, faster learning, weaker privacy</li>
          <li><strong>Recommended:</strong> 1.1 for good privacy-utility balance</li>
        </ul>
      </div>
    )
  },

  aggregationMethod: {
    title: 'Aggregation Method',
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Algorithm used to combine model updates from all devices into a global model.</p>
        <p className="font-medium mt-2">Methods:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>FedAvg:</strong> Simple averaging - fast, works well for IID data</li>
          <li><strong>FedProx:</strong> Adds regularization - better for non-IID data</li>
          <li><strong>SCAFFOLD:</strong> Control variates - handles data heterogeneity best</li>
        </ul>
        <p className="text-xs mt-2 text-blue-300">Tip: Start with FedAvg, switch to FedProx if devices have very different data distributions.</p>
      </div>
    )
  }
}

// Pre-defined tooltip content for model creation
export const MODEL_TOOLTIPS = {
  modelName: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>A unique identifier for your machine learning model within the system.</p>
        <p className="font-medium mt-2">Best practices:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Use descriptive names that indicate purpose</li>
          <li>Include the target equipment or process</li>
          <li>Avoid special characters and spaces</li>
        </ul>
        <p className="text-xs mt-2 text-blue-300">Example: "CNC_Spindle_Failure_Predictor"</p>
      </div>
    )
  },

  description: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Provides context about the model's purpose, capabilities, and intended use.</p>
        <p className="font-medium mt-2">Include:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>What the model predicts or detects</li>
          <li>Target equipment or process</li>
          <li>Key input features used</li>
          <li>Expected accuracy or performance</li>
        </ul>
      </div>
    )
  },

  modelType: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Defines the fundamental architecture and output type of your model.</p>
        <p className="font-medium mt-2">Types:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Classification:</strong> Predicts categories (e.g., "fail" vs "normal")</li>
          <li><strong>Regression:</strong> Predicts continuous values (e.g., remaining useful life)</li>
          <li><strong>Anomaly Detection:</strong> Identifies unusual patterns or outliers</li>
          <li><strong>Object Detection:</strong> Locates and identifies objects in images</li>
        </ul>
        <p className="text-xs mt-2 text-amber-300">Choose based on what you need to predict!</p>
      </div>
    )
  },

  targetUseCase: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Specifies the industrial application this model is designed for.</p>
        <p className="font-medium mt-2">Use cases:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Predictive Maintenance:</strong> Forecast equipment failures before they occur</li>
          <li><strong>Quality Control:</strong> Detect defects and ensure product quality</li>
          <li><strong>Energy Optimization:</strong> Reduce energy consumption and costs</li>
          <li><strong>Process Optimization:</strong> Improve efficiency and throughput</li>
          <li><strong>Anomaly Detection:</strong> Identify unusual system behavior</li>
        </ul>
        <p className="text-xs mt-2 text-blue-300">This helps organize models and optimize training parameters.</p>
      </div>
    )
  }
}

// Pre-defined tooltip content for device creation
export const DEVICE_TOOLTIPS = {
  deviceName: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>A human-readable name to identify this device in your fleet.</p>
        <p className="font-medium mt-2">Best practices:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Include location or function (e.g., "CNC-Mill-Floor2")</li>
          <li>Use consistent naming conventions</li>
          <li>Make it easy to identify in lists</li>
        </ul>
      </div>
    )
  },

  deviceUID: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>A unique identifier for the device across your entire system.</p>
        <p className="font-medium mt-2">Options:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Auto-generate:</strong> Leave blank for a system-generated UID</li>
          <li><strong>Custom:</strong> Use your own format (e.g., serial number)</li>
          <li>Must be unique across all devices</li>
        </ul>
        <p className="text-xs mt-2 text-blue-300">Format: PREFIX-TIMESTAMP-RANDOM (e.g., ED-LK5M2-AB12)</p>
      </div>
    )
  },

  deviceType: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Defines the hardware type and capabilities of the device.</p>
        <p className="font-medium mt-2">Types:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Edge Compute:</strong> Full ML inference capability (Jetson, RPi)</li>
          <li><strong>Sensor Gateway:</strong> Collects and forwards sensor data</li>
          <li><strong>PLC:</strong> Programmable Logic Controller integration</li>
          <li><strong>Camera:</strong> Vision-based monitoring device</li>
          <li><strong>Simulated:</strong> Virtual device using uploaded datasets</li>
        </ul>
        <p className="text-xs mt-2 text-amber-300">Type determines available features and training compatibility.</p>
      </div>
    )
  },

  datasetFile: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Provides training data for simulated device behavior.</p>
        <p className="font-medium mt-2">Supported formats:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>CSV:</strong> Comma-separated values (most common)</li>
          <li><strong>JSON:</strong> Array of records or object with data field</li>
          <li><strong>Parquet:</strong> Columnar format for large datasets</li>
        </ul>
        <p className="font-medium mt-2">Data requirements:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Include timestamp column if time-series data</li>
          <li>Sensor readings as numeric columns</li>
          <li>Optional: labels for supervised learning</li>
        </ul>
      </div>
    )
  },

  deviceGroup: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Assigns the device to a logical group for organization and batch operations.</p>
        <p className="font-medium mt-2">Benefits:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Deploy models to entire groups at once</li>
          <li>View aggregated metrics by group</li>
          <li>Apply policies to multiple devices</li>
          <li>Organize by location, function, or equipment type</li>
        </ul>
        <p className="text-xs mt-2 text-blue-300">Optional: Can be assigned later from Device settings.</p>
      </div>
    )
  },

  ipAddress: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Network address for communicating with the device.</p>
        <p className="font-medium mt-2">Formats supported:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>IPv4:</strong> e.g., 192.168.1.100</li>
          <li><strong>IPv6:</strong> e.g., fe80::1</li>
          <li><strong>Hostname:</strong> e.g., device1.local</li>
        </ul>
        <p className="text-xs mt-2 text-amber-300">Optional for simulated devices.</p>
      </div>
    )
  },

  firmwareVersion: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Tracks the software version running on the device.</p>
        <p className="font-medium mt-2">Used for:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Compatibility checking with model deployments</li>
          <li>Identifying devices needing updates</li>
          <li>Troubleshooting device-specific issues</li>
        </ul>
        <p className="text-xs mt-2 text-blue-300">Format: Semantic versioning (MAJOR.MINOR.PATCH)</p>
      </div>
    )
  }
}

// Pre-defined tooltip content for Maintenance page
export const MAINTENANCE_TOOLTIPS = {
  pageOverview: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Predictive Maintenance Overview</p>
        <p>This page shows AI-generated predictions for when equipment may need maintenance, helping you prevent unexpected failures.</p>
        <p className="font-medium mt-2">Key benefits:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Reduce unplanned downtime by 30-50%</li>
          <li>Optimize maintenance schedules</li>
          <li>Lower repair costs through early intervention</li>
          <li>Extend equipment lifespan</li>
        </ul>
      </div>
    )
  },

  generatePredictions: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Runs ML models on device sensor data to predict potential failures and maintenance needs.</p>
        <p className="font-medium mt-2">How it works:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Analyzes vibration, temperature, and operational patterns</li>
          <li>Compares against historical failure signatures</li>
          <li>Calculates remaining useful life (RUL)</li>
          <li>Assigns risk levels based on probability</li>
        </ul>
        <p className="text-xs mt-2 text-blue-300">Run periodically or after unusual events.</p>
      </div>
    )
  },

  deviceColumn: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Device</p>
        <p>The equipment being monitored for maintenance needs.</p>
        <p className="text-xs mt-2">Click on a device name to view its full sensor history and past maintenance records.</p>
      </div>
    )
  },

  componentColumn: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Component</p>
        <p>The specific part or subsystem predicted to need maintenance.</p>
        <p className="font-medium mt-2">Common components:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Bearings:</strong> Wear from friction and load</li>
          <li><strong>Motors:</strong> Electrical or mechanical degradation</li>
          <li><strong>Belts:</strong> Stretch, wear, or misalignment</li>
          <li><strong>Filters:</strong> Clogging reducing efficiency</li>
          <li><strong>Seals:</strong> Leakage from wear</li>
        </ul>
      </div>
    )
  },

  predictionType: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Prediction Type</p>
        <p>The category of maintenance event being predicted.</p>
        <p className="font-medium mt-2">Types:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Wear:</strong> Gradual degradation from normal use</li>
          <li><strong>Failure:</strong> Imminent breakdown expected</li>
          <li><strong>Calibration:</strong> Sensor drift requiring adjustment</li>
          <li><strong>Replacement:</strong> Part end-of-life approaching</li>
          <li><strong>Inspection:</strong> Anomaly detected, needs human check</li>
        </ul>
      </div>
    )
  },

  riskLevel: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Risk Level</p>
        <p>Urgency indicator based on failure probability and business impact.</p>
        <p className="font-medium mt-2">Levels:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong className="text-emerald-400">Low:</strong> Monitor - schedule during next planned downtime</li>
          <li><strong className="text-amber-400">Medium:</strong> Plan - schedule within 2-4 weeks</li>
          <li><strong className="text-orange-400">High:</strong> Priority - address within 1 week</li>
          <li><strong className="text-rose-400">Critical:</strong> Urgent - immediate action required</li>
        </ul>
        <p className="text-xs mt-2 text-amber-300">Risk combines failure probability with production impact.</p>
      </div>
    )
  },

  predictedDate: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Predicted Date</p>
        <p>Estimated date when the maintenance event is likely to occur if no action is taken.</p>
        <p className="font-medium mt-2">Understanding the prediction:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Based on degradation rate trends</li>
          <li>Confidence interval typically ±15%</li>
          <li>Updates as new sensor data arrives</li>
          <li>Earlier dates = faster degradation detected</li>
        </ul>
        <p className="text-xs mt-2 text-blue-300">Schedule maintenance BEFORE this date!</p>
      </div>
    )
  },

  estimatedCost: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Estimated Cost</p>
        <p>Projected cost if the maintenance is performed proactively.</p>
        <p className="font-medium mt-2">Cost factors:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Parts and materials</li>
          <li>Labor hours estimated</li>
          <li>Typical downtime duration</li>
        </ul>
        <p className="text-xs mt-2 text-amber-300">Reactive repairs typically cost 3-5x more due to emergency response and collateral damage.</p>
      </div>
    )
  },

  statusColumn: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Status</p>
        <p>Current state of the maintenance prediction in your workflow.</p>
        <p className="font-medium mt-2">Statuses:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>New:</strong> Recently generated, needs review</li>
          <li><strong>Acknowledged:</strong> Reviewed by maintenance team</li>
          <li><strong>Scheduled:</strong> Work order created</li>
          <li><strong>In Progress:</strong> Maintenance being performed</li>
          <li><strong>Completed:</strong> Maintenance finished</li>
          <li><strong>Dismissed:</strong> False positive or deferred</li>
        </ul>
      </div>
    )
  }
}

// Pre-defined tooltip content for Quality page
export const QUALITY_TOOLTIPS = {
  pageOverview: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Quality Inspection Overview</p>
        <p>This page shows AI-powered quality inspection results from your production line.</p>
        <p className="font-medium mt-2">How it works:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>ML models analyze sensor data or images</li>
          <li>Automatically classifies products as pass/fail</li>
          <li>Detects specific defect types</li>
          <li>Allows human override for edge cases</li>
        </ul>
      </div>
    )
  },

  generateInspections: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">What it does:</p>
        <p>Creates sample inspection records for testing and demonstration.</p>
        <p className="font-medium mt-2">In production:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Inspections generated automatically from production line</li>
          <li>Camera-based visual inspection</li>
          <li>Sensor-based measurement validation</li>
          <li>Real-time defect detection</li>
        </ul>
      </div>
    )
  },

  totalInspections: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Total Inspections</p>
        <p>Total number of quality checks performed in the selected time period.</p>
        <p className="font-medium mt-2">What to monitor:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Should align with production volume</li>
          <li>Sudden drops may indicate sensor issues</li>
          <li>Track trends over time</li>
        </ul>
      </div>
    )
  },

  passRate: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Pass Rate</p>
        <p>Percentage of products that meet quality standards.</p>
        <p className="font-medium mt-2">Industry benchmarks:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>{">"} 99%:</strong> World-class (Six Sigma)</li>
          <li><strong>95-99%:</strong> Good performance</li>
          <li><strong>90-95%:</strong> Needs improvement</li>
          <li><strong>{"<"} 90%:</strong> Critical - investigate root causes</li>
        </ul>
        <p className="text-xs mt-2 text-amber-300">Track this metric over time to spot quality trends.</p>
      </div>
    )
  },

  failedCount: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Failed Inspections</p>
        <p>Number of products that failed quality checks.</p>
        <p className="font-medium mt-2">Actions to take:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Analyze defect type patterns</li>
          <li>Identify problematic devices/lines</li>
          <li>Correlate with process parameters</li>
          <li>Track by time of day/shift</li>
        </ul>
        <p className="text-xs mt-2 text-blue-300">Click to filter table by failed items.</p>
      </div>
    )
  },

  overridesCount: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Human Overrides</p>
        <p>Number of AI decisions that were manually corrected by operators.</p>
        <p className="font-medium mt-2">What this tells you:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>High overrides:</strong> Model may need retraining</li>
          <li><strong>Override patterns:</strong> Specific defect types being missed</li>
          <li><strong>Decreasing trend:</strong> Model improving over time</li>
        </ul>
        <p className="text-xs mt-2 text-amber-300">Override data feeds back into model training!</p>
      </div>
    )
  },

  deviceColumn: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Device</p>
        <p>The inspection station or camera that performed this quality check.</p>
        <p className="text-xs mt-2">Compare defect rates across devices to identify equipment calibration issues.</p>
      </div>
    )
  },

  resultColumn: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Result</p>
        <p>The quality classification assigned to this product.</p>
        <p className="font-medium mt-2">Classifications:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong className="text-emerald-400">Pass:</strong> Meets all quality criteria</li>
          <li><strong className="text-rose-400">Fail:</strong> Defect detected, product rejected</li>
          <li><strong className="text-amber-400">Warning:</strong> Borderline - may need manual review</li>
        </ul>
      </div>
    )
  },

  defectType: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Defect Type</p>
        <p>The specific quality issue detected by the ML model.</p>
        <p className="font-medium mt-2">Common defect categories:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>Surface:</strong> Scratches, dents, discoloration</li>
          <li><strong>Dimensional:</strong> Size out of tolerance</li>
          <li><strong>Assembly:</strong> Missing parts, misalignment</li>
          <li><strong>Contamination:</strong> Foreign particles</li>
          <li><strong>Functional:</strong> Performance test failure</li>
        </ul>
      </div>
    )
  },

  confidenceScore: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Confidence Score</p>
        <p>How certain the ML model is about its classification.</p>
        <p className="font-medium mt-2">Interpreting scores:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li><strong>{">"} 95%:</strong> High confidence - trust the result</li>
          <li><strong>80-95%:</strong> Good confidence - reliable</li>
          <li><strong>60-80%:</strong> Moderate - may warrant review</li>
          <li><strong>{"<"} 60%:</strong> Low - human verification recommended</li>
        </ul>
        <p className="text-xs mt-2 text-amber-300">Low confidence items are prime candidates for human override.</p>
      </div>
    )
  },

  humanOverride: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Human Override</p>
        <p>Indicates if an operator manually changed the AI's classification.</p>
        <p className="font-medium mt-2">Why overrides matter:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Captures edge cases the model missed</li>
          <li>Creates training data for model improvement</li>
          <li>Maintains human oversight of critical decisions</li>
          <li>Tracks model accuracy over time</li>
        </ul>
        <p className="text-xs mt-2 text-blue-300">Override data is used to retrain models for better accuracy.</p>
      </div>
    )
  },

  timestamp: {
    content: (
      <div className="space-y-2">
        <p className="font-medium">Timestamp</p>
        <p>When the quality inspection was performed.</p>
        <p className="font-medium mt-2">Time-based analysis:</p>
        <ul className="list-disc list-inside text-xs space-y-1">
          <li>Identify quality trends by shift</li>
          <li>Correlate with process changes</li>
          <li>Track inspection throughput</li>
          <li>Detect time-based patterns</li>
        </ul>
      </div>
    )
  }
}
