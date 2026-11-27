/**
 * VeeraML guided learning path: Stages → Sub-modules → Core / Practice / Deeper lessons.
 * The VeeraML Curriculum lesson is the core step of each sub-module; runnable code, notebooks and
 * the visual math scripts are practice; alternative write-ups are "go deeper".
 */
import { getCurriculumIndex } from '@/content/loadCurriculum'
import { resolvePath, type ResolvedPath, type Rule, type StageDef } from '@/content/paths/engine'

const CUR = /^VeeraML Curriculum$/
const BLUE = /^ML Process Blueprint$/
const NB = /^Hands-on Concept Notebooks$/
const VIS = /^Math & Models with Visuals$/
const ALT = /^(ML Essentials|Algorithm Deep Dives)$/
const ANY = /.*/

const play = (id: string, title: string) => ({ to: `/labs/${id}`, title })

/** All lessons of a module whose title matches `t`, with roles by series. */
function rules(module: string, t: RegExp): Rule[] {
  const m = new RegExp(`^${module}$`)
  const runnable = new RegExp(`(?=.*runnable code)(?=.*(?:${t.source}))`, 'i')
  return [
    { m, s: CUR, t, role: 'core' },
    { m, s: BLUE, t, role: 'core' },
    { m, s: NB, t, role: 'practice' },
    { m, s: VIS, t, role: 'practice' },
    { m, s: ALT, t: runnable, role: 'practice' },
    { m, s: ALT, t, role: 'deeper' },
  ]
}

const STAGES: StageDef[] = [
  {
    id: 'ml-start',
    title: 'Stage 1 · How ML works & the math behind it',
    level: 'Beginner',
    color: '#ea580c',
    blurb: 'The end-to-end workflow, types of learning, splits and leakage — then the linear algebra, calculus, probability and information theory every model relies on.',
    topics: [
      {
        id: 'workflow',
        title: 'The ML Workflow, Types of Learning & Data Splits',
        icon: '🧭',
        blurb: 'Frame the problem, split before you fit, avoid leakage, and pick supervised, unsupervised or reinforcement learning.',
        kw: /\b(supervised|unsupervised|reinforcement|workflow|train(ing)? set|validation set|test set|leakage|batch learning|online learning|terminology)\b/i,
        rules: [...rules('01', /^(?!programming)/i), { m: /^01$/, s: CUR, t: /programming/i, role: 'deeper' }],
        sims: ['ml-pipeline-leakage'],
      },
      {
        id: 'linear-algebra',
        title: 'Linear Algebra: Vectors, Matrices, Eigenvectors & SVD',
        icon: '📐',
        blurb: 'Shapes, dot products, inverses and rank, eigen-decomposition and the SVD behind PCA.',
        kw: /\b(vector|matri|tensor|dot product|eigen|svd|singular value|determinant|rank|linear algebra)\b/i,
        rules: rules('02', /vector|dot|inverse|eigen|svd|linear algebra/i),
      },
      {
        id: 'calculus',
        title: 'Calculus & Optimisation: Gradients and Gradient Descent',
        icon: '⛰️',
        blurb: 'Derivatives and the chain rule, gradients, Jacobians and Hessians, Taylor series and convex optimisation.',
        kw: /\b(derivative|chain rule|gradient|jacobian|hessian|taylor|convex|optimi[sz])\b/i,
        rules: rules('02', /derivative|gradient|jacobian|taylor|optimization|calculus/i),
        sims: ['ml-gradient-descent'],
        labs: [play('gradient-descent', 'Gradient Descent Lab')],
      },
      {
        id: 'probability',
        title: 'Probability & Statistics: Bayes, MLE, Tests & the CLT',
        icon: '🎲',
        blurb: 'Distributions, expectation and variance, Bayes’ theorem, maximum likelihood and MAP, hypothesis tests, confidence intervals and the CLT.',
        kw: /\b(probabilit|distribution|bayes|likelihood|\bmle\b|\bmap\b|hypothesis|p-?value|confidence interval|central limit|variance|expected value)\b/i,
        rules: rules('02', /probab|expected|bayes|likelihood|mle|hypothesis|confidence|clt|statistic|distribution/i),
      },
      {
        id: 'information-theory',
        title: 'Information Theory: Entropy, Cross-Entropy & KL',
        icon: '📡',
        blurb: 'Why cross-entropy is the classification loss, KL divergence and mutual information for feature selection.',
        kw: /\b(entropy|cross-?entropy|kl divergence|mutual information|information gain)\b/i,
        rules: rules('02', ANY),
      },
    ],
  },
  {
    id: 'ml-data',
    title: 'Stage 2 · Preparing data',
    level: 'Beginner',
    color: '#0891b2',
    blurb: 'Turn raw tables into model-ready features without leaking information.',
    topics: [
      {
        id: 'cleaning',
        title: 'Scaling, Encoding, Missing Values & Outliers',
        icon: '🧹',
        blurb: 'StandardScaler vs MinMax vs Robust, one-hot vs target encoding, imputation strategies and outlier treatment.',
        kw: /\b(scal|normali[sz]|standardi[sz]|encod|one-?hot|missing|imput|outlier)\b/i,
        rules: rules('03', /scal|encod|missing|imput|outlier/i),
      },
      {
        id: 'features-pipelines',
        title: 'Imbalanced Data, Feature Engineering, Leakage & Pipelines',
        icon: '🔧',
        blurb: 'SMOTE and class weights, feature construction, fit vs transform, and leak-free scikit-learn pipelines.',
        kw: /\b(imbalanc|smote|class weight|feature (engineer|construct|select)|pipeline|fit_transform|leakage|eda)\b/i,
        rules: rules('03', ANY),
        sims: ['ml-pipeline-leakage'],
      },
    ],
  },
  {
    id: 'ml-supervised',
    title: 'Stage 3 · Supervised learning',
    level: 'Intermediate',
    color: '#16a34a',
    blurb: 'Regression, classification and the ensembles that win on tabular data.',
    topics: [
      {
        id: 'regression',
        title: 'Regression, Loss Functions & Regularisation',
        icon: '📈',
        blurb: 'Linear and polynomial regression, MSE/MAE/Huber, the bias-variance tradeoff and Ridge/Lasso/Elastic Net.',
        kw: /\b(linear regression|polynomial|ridge|lasso|elastic net|mse|mae|huber|least squares|r2|r-squared)\b/i,
        rules: rules('04', ANY),
        sims: ['ml-gradient-descent'],
        labs: [play('bias-variance', 'Bias–Variance Lab'), play('gradient-descent', 'Gradient Descent Lab')],
      },
      {
        id: 'classification',
        title: 'Classification: Logistic Regression, KNN, SVM, Trees, Naive Bayes',
        icon: '🏷️',
        blurb: 'Probabilities and thresholds, distance-based and margin-based classifiers, tree splits and probabilistic models.',
        kw: /\b(logistic|knn|nearest neighbo|svm|support vector|kernel|decision tree|gini|naive bayes|classif)\b/i,
        rules: rules('05', ANY),
        sims: ['ml-decision-tree', 'ml-threshold'],
        labs: [play('threshold', 'Threshold & Confusion Matrix Lab')],
      },
      {
        id: 'ensembles',
        title: 'Ensembles: Bagging, Random Forest, Boosting & XGBoost',
        icon: '🌲',
        blurb: 'Why averaging decorrelated trees works, how boosting fits residuals, and XGBoost/LightGBM/CatBoost in practice.',
        kw: /\b(bagging|boosting|random forest|adaboost|xgboost|lightgbm|catboost|ensemble|stacking)\b/i,
        rules: rules('06', ANY),
        sims: ['ml-random-forest', 'ml-gradient-boosting'],
      },
    ],
  },
  {
    id: 'ml-unsup-eval',
    title: 'Stage 4 · Unsupervised learning, evaluation & tuning',
    level: 'Intermediate',
    color: '#9333ea',
    blurb: 'Find structure without labels, then measure, validate and tune models honestly.',
    topics: [
      {
        id: 'clustering',
        title: 'Clustering: K-Means, Hierarchical, DBSCAN & GMM',
        icon: '🔵',
        blurb: 'Centroid, hierarchical, density-based and probabilistic clustering, and how to choose the number of clusters.',
        kw: /\b(cluster|k-?means|dbscan|hierarch|dendrogram|gaussian mixture|gmm|silhouette|elbow)\b/i,
        rules: rules('07', /cluster|k-means|kmeans|dbscan|hierarch|gaussian|gmm/i),
        sims: ['ml-kmeans'],
        labs: [play('kmeans', 'K-Means Lab')],
      },
      {
        id: 'dimensionality',
        title: 'Dimensionality Reduction & Anomaly Detection',
        icon: '🗜️',
        blurb: 'PCA, t-SNE and UMAP for compression and visualisation, Isolation Forest and One-Class SVM for anomalies.',
        kw: /\b(pca|principal component|t-?sne|umap|dimensional|anomal|isolation forest)\b/i,
        rules: rules('07', ANY),
      },
      {
        id: 'metrics',
        title: 'Metrics, Learning Curves & Debugging Models',
        icon: '📏',
        blurb: 'Confusion matrix, precision/recall/F1, ROC and PR curves, regression metrics, learning curves and common ML bugs.',
        kw: /\b(precision|recall|f1|confusion|roc|auc|metric|accuracy|learning curve|debug)\b/i,
        rules: rules('08', /metric|evaluat|confusion|learning curve|debug|classification/i),
        sims: ['ml-threshold'],
        labs: [play('threshold', 'Threshold & Confusion Matrix Lab')],
      },
      {
        id: 'validation-tuning',
        title: 'Cross-Validation, Regularisation & Hyperparameter Tuning',
        icon: '🎛️',
        blurb: 'K-fold and its variants, bootstrapping, the bias-variance tradeoff, regularisation and grid/random/Bayesian search.',
        kw: /\b(cross-?validation|k-?fold|bootstrap|bias|variance|overfit|underfit|regulari[sz]|hyper ?parameter|grid search|optuna)\b/i,
        rules: rules('08', ANY),
        sims: ['ml-kfold'],
        labs: [play('bias-variance', 'Bias–Variance Lab')],
      },
    ],
  },
  {
    id: 'ml-deep',
    title: 'Stage 5 · Deep learning, NLP, LLMs & MLOps',
    level: 'Advanced',
    color: '#dc2626',
    blurb: 'Neural networks and how they train, CNNs, RNNs and transformers, modern NLP and LLMs, and running models in production.',
    topics: [
      {
        id: 'nn-foundations',
        title: 'Neural Network Foundations & Backpropagation',
        icon: '🧠',
        blurb: 'Perceptrons and MLPs, tensors, activations, forward/backward propagation, losses, initialisation, batch norm and dropout.',
        kw: /\b(neuron|perceptron|mlp|backprop|activation|relu|sigmoid|batch norm|dropout|initiali[sz]|vanishing|exploding)\b/i,
        rules: rules('09', /neuron|perceptron|multi-layer|tensor|activation|forward|loss|initiali|gradient issues|batch norm|dropout/i),
        sims: ['ml-backprop'],
      },
      {
        id: 'training',
        title: 'Training Deep Networks: Optimisers, Learning Rates & Stability',
        icon: '⚙️',
        blurb: 'SGD to AdamW, learning-rate schedules, gradient clipping, mixed precision, accumulation, checkpointing and tuning.',
        kw: /\b(sgd|adam|optimi[sz]er|momentum|learning rate|warmup|cosine|clipping|mixed precision|checkpoint|gradient accumulation)\b/i,
        rules: rules('09', /gradient descent|optimizer|learning rate|stability|precision|accumulation|checkpoint|hyperparameter/i),
      },
      {
        id: 'architectures',
        title: 'CNNs, RNNs, Attention & Generative Models',
        icon: '🏗️',
        blurb: 'Convolutions and classic CNNs, ResNets, RNNs/LSTMs, self-attention and transformers, GANs, VAEs and diffusion.',
        kw: /\b(cnn|convolution|pooling|resnet|rnn|lstm|gru|attention|transformer|gan|vae|diffusion|computer vision)\b/i,
        rules: rules('09', ANY),
      },
      {
        id: 'nlp',
        title: 'NLP: Text Processing, TF-IDF, Classical Models & Embeddings',
        icon: '💬',
        blurb: 'Encoding, cleaning and tokenisation, bag of words and TF-IDF, text classifiers, Word2Vec, GloVe and sentence embeddings.',
        kw: /\b(tokeni[sz]|bag of words|tf-?idf|n-?gram|word2vec|glove|fasttext|embedding|text classification|stemming)\b/i,
        rules: rules('10', /encoding|cleaning|tokeniz|one-hot|bag of words|n-gram|tf-idf|feature engineering for text|for text|ml pipeline|word2vec|embedding|glove|sentence/i),
      },
      {
        id: 'llms',
        title: 'Transformers, Hugging Face, Fine-Tuning, RAG & Agents',
        icon: '🤖',
        blurb: 'Attention and BERT/GPT/T5, the Hugging Face stack, fine-tuning with LoRA/QLoRA, RAG and LLM agents.',
        kw: /\b(bert|gpt|t5|hugging ?face|fine-?tun|lora|qlora|peft|rag|retrieval|agent|prompt|llm)\b/i,
        rules: rules('10', ANY),
      },
      {
        id: 'mlops',
        title: 'MLOps: Deployment, Tracking, Monitoring & Drift',
        icon: '🚀',
        blurb: 'Serialisation and serving, experiment tracking and registries, pipelines, monitoring and retraining on drift.',
        kw: /\b(mlops|deploy|serving|fastapi|docker|mlflow|registry|monitor|drift|skew|production)\b/i,
        rules: rules('11', ANY),
        sims: ['ml-mlops-drift'],
      },
    ],
  },
]

let cached: ResolvedPath | null = null

export function getMlPath(): ResolvedPath {
  if (cached) return cached
  const all = (getCurriculumIndex().lessonsByTrack.veeraml || []).filter((l) => Number(l.title.slice(0, 2)) < 20)
  cached = resolvePath(all, STAGES)
  return cached
}
