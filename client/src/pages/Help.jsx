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
  AlertTriangle
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
- Upload CSV/JSON datasets to simulate device data
- Perfect for prototyping before deploying to real hardware

**Option 3: Hybrid**
- Mix real devices with simulated ones
- Test model performance before full deployment

To upload a dataset for testing:
1. Go to **Devices** → **Add Device**
2. Select "Simulated Device" as device type
3. Upload your dataset (CSV, JSON, or Parquet)
4. The system will treat it as a federated client`
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
- CSV (recommended for tabular data)
- JSON (for structured/nested data)
- Parquet (for large datasets)

**CSV Requirements:**
\`\`\`
timestamp,sensor_1,sensor_2,label
2024-01-01 00:00:00,23.5,45.2,normal
2024-01-01 00:01:00,24.1,46.0,normal
\`\`\`

**Required Columns (varies by use case):**
- **Timestamp**: ISO 8601 format
- **Features**: Numeric sensor values
- **Label/Target**: For supervised learning

**Tips:**
- Use consistent column names
- Handle missing values before upload
- Normalize numeric features for best results`
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
      'Select "Simulated Device"',
      'Upload a sample CSV or use demo data',
      'Go to Models → Create Model',
      'Choose model type matching your data',
      'Go to Training → Start Training',
      'Select your model and simulated device',
      'Monitor training progress'
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
  }
]

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
