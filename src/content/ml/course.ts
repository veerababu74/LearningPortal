import type { CourseConfig } from '@/content/courseKit'
import { ML_GALLERY } from '@/content/sims/registry'

export const ML_LABS = [
  { to: '/labs/gradient-descent', icon: '⛰️', title: 'Gradient Descent Lab', text: 'Tune the learning rate and steps, scrub through updates and watch the line fit, crawl or diverge.' },
  { to: '/labs/bias-variance', icon: '🎯', title: 'Bias–Variance Lab', text: 'Raise the polynomial degree on noisy data and watch train error fall while test error turns back up.' },
  { to: '/labs/threshold', icon: '⚖️', title: 'Threshold & Confusion Matrix Lab', text: 'Drag the decision threshold: confusion matrix, precision, recall, ROC-AUC and the cost of mistakes update live.' },
  { to: '/labs/kmeans', icon: '🔵', title: 'K-Means Lab', text: 'Step through assign and update yourself, try a wrong k and bad initialisation, and watch inertia drop.' },
]

export const ML_COURSE: CourseConfig = {
  trackId: 'veeraml',
  base: '/ml',
  title: 'VeeraML',
  accent: '#ea580c',
  kicker: 'VeeraML',
  heroTitle: 'Learn machine learning from the math up — and see every idea work',
  heroText:
    'Linear algebra, calculus and probability; data preparation and feature engineering; regression, classification, ensembles and clustering; evaluation and tuning; deep learning, NLP and LLMs; and MLOps — with real plots, flow diagrams, step-by-step simulations, hands-on labs, 46 projects and an interview bank.',
  searchPlaceholder: 'Search — gradient descent, SMOTE, random forest, PCA, cross-validation, backprop, LoRA…',
  phases: [
    {
      id: 'learn',
      title: 'Learn',
      blurb: 'Eleven modules from the ML workflow and the math to deep learning, LLMs and MLOps — each with diagrams, real plots and simulations.',
      accent: '#ea580c',
      moduleIds: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'],
    },
    { id: 'exercises', title: 'Exercises', blurb: 'Graded practice exercises from every curriculum topic, grouped by module.', accent: '#1d4ed8', moduleIds: ['20'] },
    {
      id: 'projects',
      title: 'Projects',
      blurb: '15 end-to-end projects, 12 algorithm lifecycle projects (preprocess → train → deploy) and production builds.',
      accent: '#b45309',
      moduleIds: ['21'],
    },
    { id: 'interview', title: 'Interview', blurb: 'A curated bank of 52 ML interview questions and scenarios with model answers, plus a quiz.', accent: '#db2777', moduleIds: ['22'] },
  ],
  modules: {
    '01': { icon: '🧭', color: '#ea580c', blurb: 'The ML workflow end to end, types of learning, terminology, data splits and leakage, batch vs online learning.' },
    '02': { icon: '📐', color: '#7c3aed', blurb: 'Vectors and matrices, eigenvectors and SVD, derivatives and gradients, probability, Bayes, MLE, hypothesis tests and information theory.' },
    '03': { icon: '🧹', color: '#0891b2', blurb: 'Scaling, encoding, missing values, outliers, imbalanced data, feature construction, leakage and pipelines.' },
    '04': { icon: '📈', color: '#16a34a', blurb: 'Linear and polynomial regression, loss functions, the bias-variance tradeoff, Ridge, Lasso and Elastic Net.' },
    '05': { icon: '🏷️', color: '#2563eb', blurb: 'Logistic regression, KNN, SVM and kernels, decision trees and Naive Bayes.' },
    '06': { icon: '🌲', color: '#15803d', blurb: 'Bagging, random forests, AdaBoost, gradient boosting, XGBoost / LightGBM / CatBoost and stacking.' },
    '07': { icon: '🔵', color: '#9333ea', blurb: 'K-means, hierarchical clustering, DBSCAN, Gaussian mixtures, PCA, t-SNE / UMAP and anomaly detection.' },
    '08': { icon: '📏', color: '#db2777', blurb: 'Classification and regression metrics, cross-validation, learning curves, regularisation, tuning and ML debugging.' },
    '09': { icon: '🧠', color: '#dc2626', blurb: 'Neurons, MLPs, backprop, activations, optimisers, normalisation, CNNs, RNNs, attention and generative models.' },
    '10': { icon: '💬', color: '#0d9488', blurb: 'Text processing, TF-IDF, embeddings, transformers, Hugging Face, fine-tuning and LoRA, RAG and LLM agents.' },
    '11': { icon: '🚀', color: '#0369a1', blurb: 'Serialisation, serving APIs, experiment tracking, model registry, pipelines, monitoring and drift.' },
  },
  sims: ML_GALLERY,
  simModuleOf: (s) => s.module,
  visualizerBase: '/ml/visualizer',
  demoSimId: 'ml-gradient-descent',
  labs: ML_LABS,
}
