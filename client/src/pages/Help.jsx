import { useState } from 'react'
import {
  HelpCircle,
  Server,
  Brain,
  Activity,
  Upload,
  Database,
  ChevronDown,
  ChevronRight,
  Workflow,
  Shield,
  Zap,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Factory,
  Gauge,
  Settings,
  Target
} from 'lucide-react'

const faqs = [
  {
    id: 'getting-started',
    question: 'How do I get started with FedLearn Industrial?',
    answer: `To get started with federated learning on this platform:

1. **Register Devices** - First, add your edge devices (IoT sensors, industrial controllers) in the Devices section
2. **Create a Model** - Define your ML model type (classification, regression, anomaly detection)
3. **Start Training** - Launch a federated training round across your devices
4. **Monitor & Deploy** - Track training progress and deploy successful models

You can start with simulated data if you don't have physical devices connected yet.`
  },
  {
    id: 'devices-vs-datasets',
    question: 'Do I need physical devices, or can I upload a dataset?',
    answer: `**Both options are supported!**

**Option 1: Physical Devices (Production)**
- Register real IoT/edge devices that collect data locally
- Data never leaves the device - only model updates are shared
- Best for production environments with privacy requirements

**Option 2: Simulated Devices (Testing/Development)**
- Create virtual devices for testing and development
- Upload CSV/JSON/Parquet datasets to simulate device data
- Datasets are stored securely in the server's datasets/ directory
- Perfect for prototyping before deploying to real hardware

**Option 3: Hybrid**
- Mix real devices with simulated ones
- Test model performance before full deployment

To upload a dataset for testing:
1. Go to **Devices** → **Add Device**
2. Select "Simulated Device (Dataset Upload)" as device type
3. Upload your dataset (CSV, JSON, or Parquet - max 100MB)
4. Click "Create Device" - the dataset will be uploaded to /datasets/
5. The system will treat it as a federated client with local data`
  },
  {
    id: 'model-types',
    question: 'What types of models can I create?',
    answer: `FedLearn Industrial supports four model types:

**Classification**
- Predict discrete categories
- Use cases: Quality pass/fail, fault type identification
- Example: Classify product defects into categories

**Regression**
- Predict continuous values
- Use cases: Energy consumption prediction, remaining useful life
- Example: Predict equipment failure time

**Anomaly Detection**
- Identify unusual patterns
- Use cases: Sensor anomalies, unusual behavior detection
- Example: Detect abnormal vibration patterns

**Object Detection**
- Locate objects in images
- Use cases: Visual quality inspection, part identification
- Example: Detect defects in product images`
  },
  {
    id: 'training-workflow',
    question: 'How does federated training work?',
    answer: `Federated learning trains models across distributed devices without centralizing data:

**Step 1: Initialize**
- Central server sends initial model weights to all devices

**Step 2: Local Training**
- Each device trains on its local data
- Data never leaves the device

**Step 3: Aggregation**
- Devices send model updates (not data) to server
- Server aggregates updates using FedAvg, FedProx, or SCAFFOLD

**Step 4: Distribution**
- Updated global model sent back to devices
- Process repeats for multiple rounds

**Privacy Features:**
- Differential Privacy: Adds noise to prevent data reconstruction
- Secure Aggregation: Encrypts individual updates
- Audit Logging: Full compliance tracking`
  },
  {
    id: 'hyperparameters',
    question: 'What do the training hyperparameters mean?',
    answer: `**Learning Rate** (default: 0.01)
- Controls how much the model updates each step
- Lower = more stable, slower learning
- Higher = faster learning, may overshoot

**Batch Size** (default: 32)
- Number of samples processed before updating model
- Larger = more memory, smoother gradients
- Smaller = less memory, noisier updates

**Local Epochs** (default: 5)
- Training iterations per device before aggregation
- More epochs = better local fit, risk of drift
- Fewer epochs = more communication, better sync

**Privacy Parameters:**
- **Epsilon** (1.0): Privacy budget - lower = more private
- **Delta** (0.00001): Probability of privacy breach
- **Noise Multiplier** (1.1): Amount of noise added`
  },
  {
    id: 'aggregation-methods',
    question: 'What are the different aggregation methods?',
    answer: `**FedAvg (Federated Averaging)**
- Weighted average of model updates
- Best for: Homogeneous data distributions
- Pros: Simple, efficient
- Cons: Struggles with non-IID data

**FedProx (Proximal Federated)**
- Adds regularization term to prevent drift
- Best for: Heterogeneous data, unreliable devices
- Pros: Handles system heterogeneity
- Cons: Slightly slower convergence

**SCAFFOLD (Control Variates)**
- Corrects for client drift using control variates
- Best for: Highly non-IID data
- Pros: Best convergence on non-IID
- Cons: Requires more memory/communication`
  },
  {
    id: 'data-format',
    question: 'What data format should I use for uploads?',
    answer: `**Supported Formats:**
- **CSV** (recommended for tabular data) - .csv extension
- **JSON** (for structured/nested data) - .json extension
- **Parquet** (for large datasets) - .parquet extension

**Maximum File Size:** 100MB per upload

**Upload Location:** Files are stored in the server/datasets/ directory with unique filenames

**CSV Format Example:**
timestamp,sensor_1,sensor_2,label
2024-01-01 00:00:00,23.5,45.2,normal
2024-01-01 00:01:00,24.1,46.0,normal

**JSON Format Example:**
[
  {"timestamp": "2024-01-01 00:00:00", "sensor_1": 23.5, "label": "normal"},
  {"timestamp": "2024-01-01 00:01:00", "sensor_1": 24.1, "label": "normal"}
]

**Required Columns (varies by use case):**
- **Timestamp**: ISO 8601 format
- **Features**: Numeric sensor values
- **Label/Target**: For supervised learning

**Tips:**
- Use consistent column names
- Handle missing values before upload
- Normalize numeric features for best results
- Preview your data before uploading`
  },
  {
    id: 'privacy-compliance',
    question: 'How does FedLearn ensure data privacy?',
    answer: `**Privacy-First Architecture:**

1. **Data Locality**
   - Raw data never leaves edge devices
   - Only model gradients/weights transmitted

2. **Differential Privacy**
   - Mathematical privacy guarantees
   - Configurable epsilon/delta parameters
   - Prevents reconstruction attacks

3. **Secure Aggregation**
   - Individual updates encrypted
   - Server only sees aggregate result
   - Zero-knowledge of individual contributions

4. **Audit Logging**
   - Complete audit trail
   - Compliance reports (GDPR, CCPA)
   - Access control with role-based permissions

5. **Data Governance Dashboard**
   - Real-time privacy budget tracking
   - Consent management
   - Retention policy enforcement`
  }
]

const workflows = [
  {
    title: 'Quick Start: Test with Sample Data',
    icon: Zap,
    steps: [
      'Go to Devices → Add Device',
      'Select "Simulated Device (Dataset Upload)"',
      'Upload your dataset (CSV, JSON, or Parquet)',
      'Preview the data and click "Create Device"',
      'Go to Models → Create Model',
      'Choose model type matching your data',
      'Go to Training → Start Training',
      'Select your model and simulated device',
      'Monitor training progress in real-time'
    ]
  },
  {
    title: 'Production: Real Devices',
    icon: Server,
    steps: [
      'Install FedLearn agent on edge devices',
      'Register devices with unique IDs',
      'Configure data collection on devices',
      'Create and configure your ML model',
      'Deploy model to device fleet',
      'Start federated training round',
      'Monitor device participation',
      'Deploy trained model to production'
    ]
  },
  {
    title: 'Energy Consumption Prediction',
    icon: Activity,
    steps: [
      'Collect energy meter data (kWh, timestamps)',
      'Create a Regression model',
      'Set target_use_case to "energy_optimization"',
      'Configure hyperparameters for time-series',
      'Start training with historical data',
      'Validate predictions against holdout data',
      'Deploy model for real-time forecasting'
    ]
  },
  {
    title: 'Process Optimization',
    icon: Factory,
    steps: [
      'Go to Process Optimization page',
      'Select your process unit (reactor, column, etc.)',
      'Review current OEE metrics and parameters',
      'Click "Simulate" for what-if analysis',
      'Adjust temperature, pressure, flow parameters',
      'Compare predicted outcomes',
      'Click "Optimize" to get AI recommendations',
      'Apply recommended setpoints to production'
    ]
  }
]

// Training parameters reference data
const trainingParameters = {
  hyperparameters: [
    {
      name: 'Learning Rate',
      default: '0.01',
      range: '0.001 - 0.1',
      description: 'Controls how much the model adjusts its weights based on each batch of data.',
      impact: {
        higher: 'Faster learning, but risk of overshooting optimal values and unstable training',
        lower: 'More stable and precise convergence, but slower training time',
        recommendation: 'Start with 0.01. Reduce if training is unstable, increase if too slow.'
      }
    },
    {
      name: 'Batch Size',
      default: '32',
      range: '16 - 128',
      description: 'Number of samples processed before the model updates its weights.',
      impact: {
        higher: 'Smoother gradients, more memory required, faster per-epoch but fewer updates',
        lower: 'Noisier gradients (can help generalization), less memory, more updates per epoch',
        recommendation: '32 is good for most edge devices. Use 16 if memory-constrained.'
      }
    },
    {
      name: 'Local Epochs',
      default: '5',
      range: '1 - 10',
      description: 'Number of complete passes through local data before sending updates to server.',
      impact: {
        higher: 'Better local learning, but may diverge from global model (client drift)',
        lower: 'Better synchronization with global model, but more communication overhead',
        recommendation: '5 epochs balances local learning with global convergence.'
      }
    }
  ],
  privacy: [
    {
      name: 'Epsilon (ε)',
      default: '1.0',
      range: '0.1 - 10',
      description: 'Privacy budget controlling the privacy-utility tradeoff. Lower = more private.',
      impact: {
        higher: 'Better model accuracy, weaker privacy guarantees',
        lower: 'Stronger privacy protection, but reduced model performance',
        recommendation: 'Use 1.0 for balanced privacy. Note: Epsilon accumulates across rounds!'
      },
      warning: 'Total epsilon across all training rounds should stay below 10 for meaningful privacy.'
    },
    {
      name: 'Delta (δ)',
      default: '0.00001',
      range: '1e-7 - 1e-5',
      description: 'Probability that the privacy guarantee may fail. Should be very small.',
      impact: {
        higher: 'Slightly better utility, acceptable for less sensitive data',
        lower: 'Stronger guarantees, recommended for sensitive data',
        recommendation: 'Keep at 1e-5 or lower. Should be < 1/N where N is dataset size.'
      }
    },
    {
      name: 'Noise Multiplier',
      default: '1.1',
      range: '0.5 - 2.0',
      description: 'Amount of Gaussian noise added to gradients for differential privacy.',
      impact: {
        higher: 'More privacy protection, noisier gradients, slower learning',
        lower: 'Less noise, faster learning, weaker privacy',
        recommendation: '1.1 provides good privacy-utility balance for most use cases.'
      }
    }
  ],
  aggregation: [
    {
      name: 'FedAvg',
      fullName: 'Federated Averaging',
      description: 'Simple weighted average of model updates from all devices.',
      bestFor: 'Homogeneous data distributions (IID data)',
      pros: ['Simple and efficient', 'Low communication overhead', 'Well-understood theoretically'],
      cons: ['Struggles with non-IID data', 'May diverge with heterogeneous devices']
    },
    {
      name: 'FedProx',
      fullName: 'Proximal Federated Optimization',
      description: 'Adds a regularization term to prevent local models from drifting too far from global model.',
      bestFor: 'Heterogeneous data, unreliable devices, non-IID scenarios',
      pros: ['Handles system heterogeneity', 'More stable than FedAvg on non-IID', 'Configurable proximal term'],
      cons: ['Slightly slower convergence', 'Extra hyperparameter (μ) to tune']
    },
    {
      name: 'SCAFFOLD',
      fullName: 'Stochastic Controlled Averaging',
      description: 'Uses control variates to correct for client drift, tracking update directions.',
      bestFor: 'Highly non-IID data distributions',
      pros: ['Best convergence on non-IID data', 'Reduces client drift effectively', 'Proven theoretical guarantees'],
      cons: ['Requires more memory (control variates)', 'More communication per round', 'More complex implementation']
    }
  ]
}

function AccordionItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-4 text-left"
      >
        <span className="font-medium text-gray-900 dark:text-white">{faq.question}</span>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4 prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-600 dark:text-gray-300 bg-transparent p-0">
            {faq.answer}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function Help() {
  const [openFaq, setOpenFaq] = useState('getting-started')
  const [activeWorkflow, setActiveWorkflow] = useState(0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Help Center</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Learn how to use FedLearn Industrial for federated machine learning
        </p>
      </div>

      {/* Quick Answer Banner */}
      <div className="card p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Can I test without physical devices?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-3">
              <strong>Yes!</strong> You can upload a dataset (CSV, JSON) and create simulated devices
              to test federated learning without any hardware. This is perfect for:
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Prototyping
              </span>
              <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Algorithm Testing
              </span>
              <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Learning the Platform
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Guides */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-5 h-5" />
            Step-by-Step Workflows
          </h2>
        </div>
        <div className="flex">
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {workflows.map((workflow, idx) => (
              <button
                key={idx}
                onClick={() => setActiveWorkflow(idx)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  activeWorkflow === idx
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-r-2 border-blue-600'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <workflow.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{workflow.title}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              {(() => {
                const Icon = workflows[activeWorkflow].icon
                return <Icon className="w-5 h-5 text-blue-600" />
              })()}
              {workflows[activeWorkflow].title}
            </h3>
            <ol className="space-y-3">
              {workflows[activeWorkflow].steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Training Parameters Reference */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-violet-600" />
            Training Parameters Reference
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Detailed guide to all configurable training parameters and their effects
          </p>
        </div>

        {/* Hyperparameters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600" />
            Hyperparameters
          </h3>
          <div className="space-y-4">
            {trainingParameters.hyperparameters.map((param) => (
              <div key={param.name} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{param.name}</span>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded">
                      Default: {param.default}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      Range: {param.range}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{param.description}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded">
                    <span className="font-medium text-rose-700 dark:text-rose-400">Higher value:</span>
                    <p className="text-rose-600 dark:text-rose-300 mt-1">{param.impact.higher}</p>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                    <span className="font-medium text-blue-700 dark:text-blue-400">Lower value:</span>
                    <p className="text-blue-600 dark:text-blue-300 mt-1">{param.impact.lower}</p>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Recommendation:</span>
                    <p className="text-emerald-600 dark:text-emerald-300 mt-1">{param.impact.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Parameters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600" />
            Differential Privacy
          </h3>
          <div className="space-y-4">
            {trainingParameters.privacy.map((param) => (
              <div key={param.name} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{param.name}</span>
                  <div className="flex gap-2">
                    <span className="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded">
                      Default: {param.default}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      Range: {param.range}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{param.description}</p>
                {param.warning && (
                  <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    {param.warning}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded">
                    <span className="font-medium text-rose-700 dark:text-rose-400">Higher value:</span>
                    <p className="text-rose-600 dark:text-rose-300 mt-1">{param.impact.higher}</p>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                    <span className="font-medium text-blue-700 dark:text-blue-400">Lower value:</span>
                    <p className="text-blue-600 dark:text-blue-300 mt-1">{param.impact.lower}</p>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">Recommendation:</span>
                    <p className="text-emerald-600 dark:text-emerald-300 mt-1">{param.impact.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Aggregation Methods */}
        <div className="p-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            Aggregation Methods
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {trainingParameters.aggregation.map((method) => (
              <div key={method.name} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="mb-3">
                  <span className="font-medium text-gray-900 dark:text-white">{method.name}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{method.fullName}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{method.description}</p>
                <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Best for:</span>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">{method.bestFor}</p>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Pros:</span>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mt-1">
                      {method.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="font-medium text-rose-600 dark:text-rose-400">Cons:</span>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 mt-1">
                      {method.cons.map((con, i) => <li key={i}>{con}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Frequently Asked Questions
        </h2>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {faqs.map((faq) => (
            <AccordionItem
              key={faq.id}
              faq={faq}
              isOpen={openFaq === faq.id}
              onToggle={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
            />
          ))}
        </div>
      </div>

      {/* Key Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white">Devices</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Edge devices that collect and process data locally. Can be physical IoT devices or simulated for testing.
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white">Models</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Machine learning models trained across your device fleet without centralizing data.
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white">Privacy</h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Differential privacy and secure aggregation ensure your data stays private throughout training.
          </p>
        </div>
      </div>

      {/* Support Note */}
      <div className="card p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-300">Need More Help?</h4>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              Check the AI Insights page for natural language queries about your system,
              or contact your administrator for technical support.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
