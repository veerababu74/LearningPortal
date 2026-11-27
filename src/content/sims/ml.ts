/**
 * VeeraML simulations — machine-learning algorithms animated step by step.
 * Every number in a step is real (computed from the small example in the scenario).
 */
import type { AgentSim } from '@/content/agents/visualizer'

/* ======================================================= 1. pipeline vs leakage */

const PIPELINE: AgentSim = {
  id: 'ml-pipeline-leakage',
  title: 'A leak-free pipeline: split first, fit on train only',
  framework: 'scikit-learn',
  group: 'Data & workflow',
  module: '03',
  home: '/ml/learn/03',
  level: 'Beginner',
  summary: 'Follow 10,000 rows through splitting, imputation, scaling and training — and see exactly where data leakage would creep in.',
  scenario: 'Predict customer churn from 10,000 rows. Income has missing values and features are on very different scales.',
  nodes: [
    { id: 'data', label: 'Raw data', sub: '10,000 rows', x: 90, y: 200, kind: 'memory' },
    { id: 'split', label: 'train_test_split', sub: '80 / 20, stratified', x: 270, y: 200, kind: 'router' },
    { id: 'prep', label: 'Imputer + Scaler', sub: 'fit on train only', x: 470, y: 90, kind: 'tool' },
    { id: 'model', label: 'LogisticRegression', sub: 'fit', x: 650, y: 90, kind: 'llm' },
    { id: 'test', label: 'Test set', sub: '2,000 rows, untouched', x: 470, y: 320, kind: 'guard' },
    { id: 'score', label: 'Score', sub: 'ROC-AUC', x: 650, y: 320, kind: 'end' },
  ],
  edges: [
    { id: 'd-s', from: 'data', to: 'split' },
    { id: 's-p', from: 'split', to: 'prep', label: 'train 8,000' },
    { id: 'p-m', from: 'prep', to: 'model' },
    { id: 's-t', from: 'split', to: 'test', label: 'test 2,000' },
    { id: 't-p', from: 'test', to: 'prep', label: 'transform only', bend: 40 },
    { id: 'm-sc', from: 'model', to: 'score' },
  ],
  code: `from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42)        # 1. split FIRST

pipe = Pipeline([
    ("impute", SimpleImputer(strategy="median")),             # learns medians
    ("scale", StandardScaler()),                              # learns mean / std
    ("model", LogisticRegression(class_weight="balanced")),
])
print(cross_val_score(pipe, X_train, y_train, cv=5, scoring="roc_auc").mean())
pipe.fit(X_train, y_train)                                    # 2. fit on train only
print(pipe.score(X_test, y_test))                             # 3. test touched once`,
  steps: [
    {
      title: 'Split before anything else',
      edge: 'd-s',
      packet: '10,000 rows',
      narration: 'The split is the first operation. Stratify keeps the churn rate (12%) identical in train and test.',
      state: { train_rows: '8,000', test_rows: '2,000', imputer_median: '—', scaler_mean: '—', test_seen_by_fit: 'no' },
      changed: ['train_rows', 'test_rows'],
      log: 'split → 8,000 train / 2,000 test (12% churn in both)',
      hl: ['X_train, X_test, y_train, y_test = train_test_split'],
      predict: {
        question: 'The scaler needs a mean and standard deviation. Which rows should it learn them from?',
        options: ['All 10,000 rows — more data is better', 'Only the 8,000 training rows', 'Only the 2,000 test rows', 'It does not matter'],
        answer: 1,
        explain: 'Statistics learned from the test rows would leak information about the test set into training, making the final score optimistic.',
      },
    },
    {
      title: 'Learn preprocessing from train only',
      edge: 's-p',
      packet: 'X_train',
      narration: 'The imputer learns the median income and the scaler learns each feature’s mean and std — from the training rows only.',
      state: { train_rows: '8,000', test_rows: '2,000', imputer_median: 'income = 54,200', scaler_mean: 'age = 41.3, tenure = 26.8', test_seen_by_fit: 'no' },
      changed: ['imputer_median', 'scaler_mean'],
      log: 'fit imputer + scaler on X_train',
      hl: ['("impute", SimpleImputer', '("scale", StandardScaler'],
    },
    {
      title: 'Cross-validate the whole pipeline',
      edge: 'p-m',
      packet: 'scaled X',
      narration: 'cross_val_score refits imputer, scaler AND model inside each of the 5 folds, so even validation scores are leak-free.',
      state: { train_rows: '8,000', test_rows: '2,000', imputer_median: 'income = 54,200', scaler_mean: 'age = 41.3, tenure = 26.8', cv_auc: '0.861 ± 0.012', test_seen_by_fit: 'no' },
      changed: ['cv_auc'],
      log: '5-fold CV ROC-AUC = 0.861 ± 0.012',
      hl: ['cross_val_score(pipe'],
    },
    {
      title: 'Transform the test set with the same parameters',
      edge: 't-p',
      packet: 'transform',
      node: 'prep',
      narration: 'The test rows are imputed with the TRAIN median and scaled with the TRAIN mean/std — never refit.',
      log: 'transform X_test with train statistics',
      hl: ['pipe.score(X_test'],
    },
    {
      title: 'Score once on the untouched test set',
      edge: 'm-sc',
      packet: 'AUC',
      node: 'score',
      tone: 'ok',
      narration: 'The test score (0.854) is close to the CV estimate (0.861): an honest result. Fitting the scaler on all 10,000 rows first would have inflated it.',
      state: { train_rows: '8,000', test_rows: '2,000', imputer_median: 'income = 54,200', scaler_mean: 'age = 41.3, tenure = 26.8', cv_auc: '0.861 ± 0.012', test_auc: '0.854', test_seen_by_fit: 'no' },
      changed: ['test_auc'],
      log: 'test ROC-AUC = 0.854 (close to CV → trustworthy)',
    },
  ],
  match: /pipeline|leakage|fit, transform|fit_transform|preprocess|data splits|dataset splits|imput|scaling/i,
  takeaways: ['Split first, then fit every preprocessing step on the training data only.', 'Put preprocessing inside a Pipeline so cross-validation refits it per fold.', 'Touch the test set once, at the end.'],
}

/* ========================================================= 2. gradient descent */

const GD: AgentSim = {
  id: 'ml-gradient-descent',
  title: 'Gradient descent fits a line',
  framework: 'NumPy',
  group: 'Math & optimisation',
  module: '04',
  home: '/ml/learn/04',
  level: 'Beginner',
  summary: 'Watch w and b move downhill on four points until the loss is almost zero — and what happens when the learning rate is too large.',
  scenario: 'Data: x = [1, 2, 3, 4], y = [3, 5, 7, 9] (the true line is y = 2x + 1). Start from w = 0, b = 0 with learning rate η = 0.05.',
  nodes: [
    { id: 'w', label: 'Weights', sub: 'w, b', x: 110, y: 200, kind: 'memory' },
    { id: 'pred', label: 'Predict', sub: 'ŷ = w·x + b', x: 300, y: 90, kind: 'llm' },
    { id: 'loss', label: 'Loss', sub: 'MSE', x: 520, y: 90, kind: 'guard' },
    { id: 'grad', label: 'Gradient', sub: '∂L/∂w, ∂L/∂b', x: 520, y: 310, kind: 'tool' },
    { id: 'upd', label: 'Update', sub: 'w ← w − η·∂L/∂w', x: 300, y: 310, kind: 'router' },
  ],
  edges: [
    { id: 'w-p', from: 'w', to: 'pred' },
    { id: 'p-l', from: 'pred', to: 'loss' },
    { id: 'l-g', from: 'loss', to: 'grad' },
    { id: 'g-u', from: 'grad', to: 'upd' },
    { id: 'u-w', from: 'upd', to: 'w' },
  ],
  code: `import numpy as np
x = np.array([1, 2, 3, 4]); y = np.array([3, 5, 7, 9])
w, b, lr = 0.0, 0.0, 0.05

for step in range(200):
    y_hat = w * x + b
    loss = np.mean((y_hat - y) ** 2)
    dw = np.mean(2 * (y_hat - y) * x)      # ∂L/∂w
    db = np.mean(2 * (y_hat - y))          # ∂L/∂b
    w -= lr * dw
    b -= lr * db`,
  steps: [
    {
      title: 'Start: predict with w = 0, b = 0',
      edge: 'w-p',
      packet: 'ŷ = 0',
      narration: 'Every prediction is 0, so every error is large.',
      state: { step: '0', w: '0.000', b: '0.000', loss: '41.00', dw: '—', db: '—' },
      changed: ['loss'],
      log: 'step 0: loss 41.00',
      hl: ['y_hat = w * x + b', 'loss = np.mean'],
    },
    {
      title: 'Compute the gradient',
      edge: 'l-g',
      packet: 'slopes',
      narration: 'The gradient says which way the loss increases: dw = −35, db = −12. Both negative → increase w and b.',
      state: { step: '0', w: '0.000', b: '0.000', loss: '41.00', dw: '−35.00', db: '−12.00' },
      changed: ['dw', 'db'],
      log: 'dw = −35.00, db = −12.00',
      hl: ['dw = np.mean', 'db = np.mean'],
      predict: {
        question: 'With η = 0.05, what is w after the first update?',
        options: ['0.05', '1.75', '35', '−1.75'],
        answer: 1,
        explain: 'w ← 0 − 0.05 × (−35) = 1.75. We step against the gradient, scaled by the learning rate.',
      },
    },
    {
      title: 'Step 1: update',
      edge: 'g-u',
      packet: 'w −= η·dw',
      node: 'upd',
      narration: 'One step takes the loss from 41.00 to 1.13.',
      state: { step: '1', w: '1.750', b: '0.600', loss: '1.13', dw: '−35.00', db: '−12.00' },
      changed: ['step', 'w', 'b', 'loss'],
      log: 'step 1: w = 1.750, b = 0.600, loss 1.13',
      hl: ['w -= lr * dw', 'b -= lr * db'],
    },
    {
      title: 'Steps 2–3: smaller gradients, smaller steps',
      edge: 'u-w',
      packet: 'repeat',
      narration: 'As the line gets closer the gradient shrinks, so the steps shrink automatically.',
      state: { step: '3', w: '2.084', b: '0.723', loss: '0.013', dw: '−0.92', db: '−0.41' },
      changed: ['step', 'w', 'b', 'loss', 'dw', 'db'],
      log: 'step 3: w = 2.084, b = 0.723, loss 0.013',
    },
    {
      title: 'Step 200: converged',
      edge: 'w-p',
      packet: 'ŷ ≈ 2x + 1',
      tone: 'ok',
      narration: 'After 200 steps w = 2.005 and b = 0.986 — essentially the true line. The intercept converges more slowly than the slope.',
      state: { step: '200', w: '2.005', b: '0.986', loss: '0.000', dw: '0.00', db: '0.00' },
      changed: ['step', 'w', 'b', 'loss'],
      log: 'step 200: loss ≈ 0',
    },
    {
      title: 'What if η = 0.2?',
      edge: 'g-u',
      packet: 'overshoot',
      node: 'upd',
      tone: 'bad',
      narration: 'With a learning rate 4× larger, each step overshoots the minimum: w goes 7.0 → −9.4 → 29.0 and the loss explodes from 224 to 6,731. Too large a learning rate diverges.',
      state: { step: '3 (η = 0.2)', w: '28.96', b: '—', loss: '6730.9', dw: '—', db: '—' },
      changed: ['w', 'loss'],
      log: 'η = 0.2: loss 224 → 1,229 → 6,731 (diverging)',
    },
  ],
  match: /gradient descent|optimization basics|linear regression|learning rate|loss function/i,
  takeaways: ['Step against the gradient, scaled by the learning rate.', 'Steps shrink naturally as the gradient shrinks near the minimum.', 'A learning rate that is too large overshoots and diverges.'],
}

/* =========================================================== 3. k-fold CV */

const KFOLD: AgentSim = {
  id: 'ml-kfold',
  title: '5-fold cross-validation, fold by fold',
  framework: 'scikit-learn',
  group: 'Evaluation',
  module: '08',
  home: '/ml/learn/08',
  level: 'Beginner',
  summary: 'Each fold takes one turn as the validation set; the five scores give a mean and a spread instead of one lucky number.',
  scenario: '5,000 training rows, a random forest, and the question: is its accuracy really 0.91, or did we get a lucky split?',
  nodes: [
    { id: 'data', label: 'Training data', sub: '5 folds × 1,000', x: 100, y: 200, kind: 'memory' },
    { id: 'fold', label: 'Fold k', sub: 'held out', x: 320, y: 90, kind: 'guard' },
    { id: 'fit', label: 'Fit on 4 folds', sub: '4,000 rows', x: 320, y: 310, kind: 'llm' },
    { id: 'score', label: 'Score fold k', sub: 'accuracy', x: 540, y: 200, kind: 'tool' },
    { id: 'agg', label: 'Aggregate', sub: 'mean ± std', x: 720, y: 200, kind: 'end' },
  ],
  edges: [
    { id: 'd-f', from: 'data', to: 'fold' },
    { id: 'd-t', from: 'data', to: 'fit' },
    { id: 't-s', from: 'fit', to: 'score' },
    { id: 'f-s', from: 'fold', to: 'score' },
    { id: 's-a', from: 'score', to: 'agg' },
  ],
  code: `from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
scores = cross_val_score(RandomForestClassifier(n_estimators=300), X, y, cv=cv)
print(scores)                      # one score per fold
print(scores.mean(), scores.std())`,
  steps: [
    { title: 'Round 1', edge: 'd-f', packet: 'fold 1', narration: 'Fold 1 is held out; the model trains on folds 2–5.', state: { round: '1 / 5', scores: '0.912', mean: '—', std: '—' }, changed: ['scores'], log: 'fold 1 → 0.912', hl: ['cv = StratifiedKFold'] },
    { title: 'Round 2', edge: 'd-t', packet: 'fold 2', node: 'fit', narration: 'A fresh model is trained on folds 1, 3, 4, 5 — nothing is carried over from round 1.', state: { round: '2 / 5', scores: '0.912, 0.897', mean: '—', std: '—' }, changed: ['scores'], log: 'fold 2 → 0.897' },
    {
      title: 'Rounds 3–5',
      edge: 't-s',
      packet: 'folds 3–5',
      narration: 'Every row is used for validation exactly once.',
      state: { round: '5 / 5', scores: '0.912, 0.897, 0.925, 0.889, 0.907', mean: '—', std: '—' },
      changed: ['scores', 'round'],
      log: 'folds 3–5 → 0.925, 0.889, 0.907',
      predict: {
        question: 'Single-split accuracy was 0.925 (that was fold 3). What should you report?',
        options: ['0.925 — the best fold', '0.906 ± 0.012 — the mean and spread', '0.889 — the worst fold', 'Retrain until one split gives 0.95'],
        answer: 1,
        explain: 'The mean over folds is a less noisy estimate; the standard deviation tells you how much a single split could mislead you.',
      },
    },
    {
      title: 'Aggregate',
      edge: 's-a',
      packet: 'mean ± std',
      tone: 'ok',
      narration: 'Accuracy ≈ 0.906 ± 0.012. A single split could have reported anything from 0.889 to 0.925.',
      state: { round: 'done', scores: '0.912, 0.897, 0.925, 0.889, 0.907', mean: '0.906', std: '0.012' },
      changed: ['mean', 'std'],
      log: 'CV accuracy = 0.906 ± 0.012',
      hl: ['print(scores.mean(), scores.std())'],
    },
  ],
  match: /cross-validation|cross validation|k-fold|resampling|validation techniques/i,
  takeaways: ['Every row validates exactly once.', 'Report the mean and the standard deviation.', 'Use stratified, grouped or time-series splits when the data demands it.'],
}

/* ======================================================== 4. decision tree split */

const TREE: AgentSim = {
  id: 'ml-decision-tree',
  title: 'How a decision tree picks its first split',
  framework: 'scikit-learn',
  group: 'Supervised learning',
  module: '05',
  home: '/ml/learn/05',
  level: 'Intermediate',
  summary: 'Compute Gini impurity for two candidate splits on 10 loan applications and see why the tree chooses income.',
  scenario: '10 loan applications: 6 approved, 4 rejected. Candidate questions: “income > 50k?” and “age > 30?”.',
  nodes: [
    { id: 'root', label: 'Root node', sub: '6 approve · 4 reject', x: 120, y: 200, kind: 'memory' },
    { id: 'inc', label: 'Split: income > 50k', sub: 'left 5 / right 5', x: 380, y: 90, kind: 'router' },
    { id: 'age', label: 'Split: age > 30', sub: 'left 6 / right 4', x: 380, y: 310, kind: 'router' },
    { id: 'best', label: 'Chosen split', sub: 'largest Gini drop', x: 640, y: 200, kind: 'end' },
  ],
  edges: [
    { id: 'r-i', from: 'root', to: 'inc' },
    { id: 'r-a', from: 'root', to: 'age' },
    { id: 'i-b', from: 'inc', to: 'best' },
  ],
  code: `def gini(counts):
    n = sum(counts)
    return 1 - sum((c / n) ** 2 for c in counts)

root = gini([6, 4])                                   # 0.480
income = 0.5 * gini([5, 0]) + 0.5 * gini([1, 4])      # 0.160
age    = 0.6 * gini([4, 2]) + 0.4 * gini([2, 2])      # 0.467
best = max([("income", root - income), ("age", root - age)], key=lambda t: t[1])`,
  steps: [
    {
      title: 'Impurity of the root',
      edge: 'r-i',
      packet: 'Gini',
      node: 'root',
      narration: 'Gini = 1 − (0.6² + 0.4²) = 0.480. A pure node would be 0.',
      state: { root_gini: '0.480', income_gini: '—', age_gini: '—', chosen: '—' },
      changed: ['root_gini'],
      log: 'root Gini = 0.480',
      hl: ['root = gini([6, 4])'],
    },
    {
      title: 'Candidate: income > 50k',
      edge: 'r-i',
      packet: '5 | 5',
      narration: 'Left: 5 approved, 0 rejected (Gini 0). Right: 1 approved, 4 rejected (Gini 0.32). Weighted: 0.5·0 + 0.5·0.32 = 0.160.',
      state: { root_gini: '0.480', income_gini: '0.160 (drop 0.320)', age_gini: '—', chosen: '—' },
      changed: ['income_gini'],
      log: 'income > 50k → weighted Gini 0.160',
      hl: ['income = 0.5 * gini'],
    },
    {
      title: 'Candidate: age > 30',
      edge: 'r-a',
      packet: '6 | 4',
      narration: 'Left: 4/2 (Gini 0.444). Right: 2/2 (Gini 0.5). Weighted 0.467 — barely better than not splitting.',
      state: { root_gini: '0.480', income_gini: '0.160 (drop 0.320)', age_gini: '0.467 (drop 0.013)', chosen: '—' },
      changed: ['age_gini'],
      log: 'age > 30 → weighted Gini 0.467',
      hl: ['age    = 0.6 * gini'],
      predict: { question: 'Which split does the tree choose?', options: ['age > 30', 'income > 50k', 'Neither — stop here', 'Both at once'], answer: 1, explain: 'Income reduces impurity by 0.320 versus 0.013 for age; the tree greedily takes the largest information gain.' },
    },
    {
      title: 'Choose income and recurse',
      edge: 'i-b',
      packet: 'income',
      tone: 'ok',
      narration: 'The left child is already pure and becomes a leaf. The right child (1 vs 4) is split again, until max_depth or min_samples_leaf stops it.',
      state: { root_gini: '0.480', income_gini: '0.160 (drop 0.320)', age_gini: '0.467 (drop 0.013)', chosen: 'income > 50k' },
      changed: ['chosen'],
      log: 'split on income > 50k; recurse on the impure child',
      hl: ['best = max('],
    },
  ],
  match: /decision tree|gini|information gain|impurity|cart/i,
  takeaways: ['Gini measures how mixed a node is.', 'The tree greedily picks the split with the largest impurity drop.', 'Depth and leaf-size limits stop it from memorising the data.'],
}

/* ========================================================== 5. random forest */

const FOREST: AgentSim = {
  id: 'ml-random-forest',
  title: 'Random forest: bootstrap, random features, vote',
  framework: 'scikit-learn',
  group: 'Ensembles',
  module: '06',
  home: '/ml/learn/06',
  level: 'Intermediate',
  summary: 'Three trees trained on different bootstrap samples and feature subsets disagree on a transaction — the vote is more reliable than any one of them.',
  scenario: 'Is a 2 a.m., $1,900 online transaction from a new device fraudulent? A forest of 3 trees (in practice: hundreds).',
  nodes: [
    { id: 'data', label: 'Training data', sub: '50,000 rows', x: 90, y: 200, kind: 'memory' },
    { id: 't1', label: 'Tree 1', sub: 'bootstrap A · amount, hour', x: 340, y: 80, kind: 'tool' },
    { id: 't2', label: 'Tree 2', sub: 'bootstrap B · device, country', x: 340, y: 200, kind: 'tool' },
    { id: 't3', label: 'Tree 3', sub: 'bootstrap C · amount, device', x: 340, y: 320, kind: 'tool' },
    { id: 'vote', label: 'Vote', sub: 'majority / mean prob.', x: 600, y: 200, kind: 'router' },
    { id: 'out', label: 'Prediction', x: 760, y: 200, kind: 'end' },
  ],
  edges: [
    { id: 'd-1', from: 'data', to: 't1' },
    { id: 'd-2', from: 'data', to: 't2' },
    { id: 'd-3', from: 'data', to: 't3' },
    { id: '1-v', from: 't1', to: 'vote' },
    { id: '2-v', from: 't2', to: 'vote' },
    { id: '3-v', from: 't3', to: 'vote' },
    { id: 'v-o', from: 'vote', to: 'out' },
  ],
  code: `from sklearn.ensemble import RandomForestClassifier

rf = RandomForestClassifier(
    n_estimators=300,          # many trees: more never overfits, only costs time
    max_features="sqrt",       # random subset of features at every split
    bootstrap=True, oob_score=True, n_jobs=-1)
rf.fit(X_train, y_train)
print(rf.oob_score_)           # free validation score from out-of-bag rows
proba = rf.predict_proba(transaction)[0, 1]`,
  steps: [
    { title: 'Bootstrap samples', edge: 'd-1', packet: 'sample A', narration: 'Each tree trains on a bootstrap sample — rows drawn with replacement. About 37% of rows are left out of each sample (out-of-bag).', state: { tree_1: '—', tree_2: '—', tree_3: '—', forest: '—' }, log: 'draw 3 bootstrap samples', hl: ['bootstrap=True'] },
    { title: 'Tree 1 votes', edge: '1-v', packet: 'fraud 0.81', narration: 'Tree 1 split mostly on amount and hour: a large night-time purchase looks fraudulent.', state: { tree_1: 'fraud (0.81)', tree_2: '—', tree_3: '—', forest: '—' }, changed: ['tree_1'], log: 'tree 1 → fraud 0.81', hl: ['max_features="sqrt"'] },
    { title: 'Tree 2 votes', edge: '2-v', packet: 'legit 0.38', narration: 'Tree 2 saw different rows and features (device, country) and is not convinced.', state: { tree_1: 'fraud (0.81)', tree_2: 'legit (0.38)', tree_3: '—', forest: '—' }, changed: ['tree_2'], log: 'tree 2 → legit 0.38', predict: { question: 'Why do the trees disagree?', options: ['A bug', 'They saw different bootstrap rows and different feature subsets', 'Tree 2 is untrained', 'Random forests average labels randomly'], answer: 1, explain: 'Decorrelated trees make different mistakes; averaging cancels much of that error — that is the whole point.' } },
    { title: 'Tree 3 votes', edge: '3-v', packet: 'fraud 0.74', narration: 'Tree 3 (amount, device) says fraud.', state: { tree_1: 'fraud (0.81)', tree_2: 'legit (0.38)', tree_3: 'fraud (0.74)', forest: '—' }, changed: ['tree_3'], log: 'tree 3 → fraud 0.74' },
    { title: 'Average the votes', edge: 'v-o', packet: '0.64', node: 'out', tone: 'warn', narration: 'Mean probability (0.81 + 0.38 + 0.74) / 3 = 0.64 → flagged for review. With 300 trees the estimate is far more stable than any single tree.', state: { tree_1: 'fraud (0.81)', tree_2: 'legit (0.38)', tree_3: 'fraud (0.74)', forest: 'fraud, p = 0.64' }, changed: ['forest'], log: 'forest → p(fraud) = 0.64 → review', hl: ['proba = rf.predict_proba'] },
  ],
  match: /random forest|bagging|bootstrap|ensemble/i,
  takeaways: ['Bootstrapped rows + random feature subsets make trees decorrelated.', 'Averaging decorrelated trees reduces variance.', 'Out-of-bag rows give a free validation score.'],
}

/* ====================================================== 6. gradient boosting */

const BOOST: AgentSim = {
  id: 'ml-gradient-boosting',
  title: 'Gradient boosting: each tree fixes the residuals',
  framework: 'scikit-learn',
  group: 'Ensembles',
  module: '06',
  home: '/ml/learn/06',
  level: 'Intermediate',
  summary: 'Four house prices, a mean prediction, and three small trees that each predict what is still wrong — the error falls from 12,969 to 1,433.',
  scenario: 'Prices (in $k): [200, 250, 300, 500]. Learning rate η = 0.5, each tree is a single split.',
  nodes: [
    { id: 'f0', label: 'F0', sub: 'mean = 312.5', x: 100, y: 200, kind: 'memory' },
    { id: 'res', label: 'Residuals', sub: 'y − F', x: 300, y: 90, kind: 'guard' },
    { id: 'tree', label: 'Small tree', sub: 'fit residuals', x: 520, y: 90, kind: 'tool' },
    { id: 'add', label: 'F ← F + η·h', sub: 'η = 0.5', x: 520, y: 310, kind: 'router' },
    { id: 'out', label: 'Ensemble', x: 300, y: 310, kind: 'end' },
  ],
  edges: [
    { id: 'f-r', from: 'f0', to: 'res' },
    { id: 'r-t', from: 'res', to: 'tree' },
    { id: 't-a', from: 'tree', to: 'add' },
    { id: 'a-o', from: 'add', to: 'out' },
    { id: 'o-r', from: 'out', to: 'res', bend: -30 },
  ],
  code: `F = np.full_like(y, y.mean(), dtype=float)          # F0 = 312.5
for m in range(3):
    residual = y - F                                  # negative gradient of MSE
    tree = DecisionTreeRegressor(max_depth=1).fit(X, residual)
    F += 0.5 * tree.predict(X)                        # shrink each step
    print(m, F.round(1), np.mean((y - F) ** 2).round())`,
  steps: [
    { title: 'Start from the mean', edge: 'f-r', packet: '312.5', narration: 'Predict 312.5 for every house. Residuals: [−112.5, −62.5, −12.5, +187.5]. MSE ≈ 12,969.', state: { round: '0', prediction: '312.5, 312.5, 312.5, 312.5', residuals: '−112.5, −62.5, −12.5, 187.5', mse: '12,969' }, changed: ['prediction', 'residuals', 'mse'], log: 'F0 = 312.5, MSE 12,969', hl: ['F = np.full_like'] },
    { title: 'Tree 1 fits the residuals', edge: 'r-t', packet: 'residuals', narration: 'A one-split tree separates the expensive house: it predicts −62.5 for the first three and +187.5 for the last.', log: 'tree 1: left −62.5 / right +187.5', hl: ['tree = DecisionTreeRegressor'], predict: { question: 'With η = 0.5, what is the new prediction for the $500k house?', options: ['500', '312.5 + 187.5 = 500', '312.5 + 0.5 × 187.5 = 406.3', '187.5'], answer: 2, explain: 'Each tree’s output is shrunk by the learning rate; small steps plus more trees generalise better.' } },
    { title: 'Add a shrunken step', edge: 't-a', packet: '+η·h', node: 'add', narration: 'Predictions move halfway toward the targets.', state: { round: '1', prediction: '281.3, 281.3, 281.3, 406.3', residuals: '−81.3, −31.3, 18.8, 93.8', mse: '4,180' }, changed: ['round', 'prediction', 'residuals', 'mse'], log: 'after tree 1: MSE 4,180', hl: ['F += 0.5 * tree.predict'] },
    { title: 'Tree 2', edge: 'o-r', packet: 'new residuals', node: 'res', narration: 'The next tree is trained on what is STILL wrong.', state: { round: '2', prediction: '265.6, 265.6, 265.6, 453.1', residuals: '−65.6, −15.6, 34.4, 46.9', mse: '1,982' }, changed: ['round', 'prediction', 'residuals', 'mse'], log: 'after tree 2: MSE 1,982' },
    { title: 'Tree 3 — and when to stop', edge: 'a-o', packet: 'ensemble', node: 'out', tone: 'ok', narration: 'MSE 1,433. With deeper trees and more rounds training error keeps falling, so stop with early stopping on a validation set before the model starts fitting noise.', state: { round: '3', prediction: '257.8, 257.8, 257.8, 476.6', residuals: '−57.8, −7.8, 42.2, 23.4', mse: '1,433' }, changed: ['round', 'prediction', 'residuals', 'mse'], log: 'after tree 3: MSE 1,433' },
  ],
  match: /gradient boosting|boosting|xgboost|lightgbm|catboost|adaboost|gbm/i,
  takeaways: ['Each tree predicts the current residuals (the negative gradient).', 'A small learning rate with more trees generalises better.', 'Use early stopping on validation data to pick the number of trees.'],
}

/* ================================================================ 7. k-means */

const KMEANS: AgentSim = {
  id: 'ml-kmeans',
  title: 'K-means: assign, move centroids, repeat',
  framework: 'scikit-learn',
  group: 'Unsupervised',
  module: '07',
  home: '/ml/learn/07',
  level: 'Beginner',
  summary: 'Seven customers, two centroids, and the two alternating steps that make K-means converge in two iterations.',
  scenario: 'Customers as (visits per month, spend in $100): (1,1), (1.5,2), (3,3), (5,7), (3.5,5), (4.5,5), (3.5,4.5). k = 2, starting centroids (1,1) and (5,7).',
  nodes: [
    { id: 'pts', label: '7 customers', sub: '2 features (scaled)', x: 100, y: 200, kind: 'memory' },
    { id: 'assign', label: 'Assign', sub: 'nearest centroid', x: 330, y: 90, kind: 'router' },
    { id: 'update', label: 'Update', sub: 'centroid = mean', x: 330, y: 310, kind: 'tool' },
    { id: 'check', label: 'Converged?', sub: 'assignments unchanged', x: 580, y: 200, kind: 'guard' },
    { id: 'done', label: 'Segments', x: 760, y: 200, kind: 'end' },
  ],
  edges: [
    { id: 'p-a', from: 'pts', to: 'assign' },
    { id: 'a-u', from: 'assign', to: 'update' },
    { id: 'u-c', from: 'update', to: 'check' },
    { id: 'c-a', from: 'check', to: 'assign', bend: -40 },
    { id: 'c-d', from: 'check', to: 'done' },
  ],
  code: `from sklearn.cluster import KMeans
km = KMeans(n_clusters=2, init=np.array([[1, 1], [5, 7]]), n_init=1)
km.fit(X)
print(km.labels_)            # [0 0 0 1 1 1 1]
print(km.cluster_centers_)   # [[1.83 2.  ] [4.13 5.38]]
print(km.inertia_)           # 9.54`,
  steps: [
    { title: 'Assign each point to the nearest centroid', edge: 'p-a', packet: 'distances', narration: '(1,1), (1.5,2) and (3,3) are closer to (1,1); the other four are closer to (5,7).', state: { iteration: '1', labels: '0 0 0 1 1 1 1', centroids: '(1, 1) · (5, 7)', inertia: '—' }, changed: ['labels'], log: 'iteration 1: assign → 0001111', hl: ['km.fit(X)'] },
    { title: 'Move each centroid to its cluster mean', edge: 'a-u', packet: 'means', narration: 'Centroid A moves to (1.83, 2.00); centroid B to (4.13, 5.38). Inertia (sum of squared distances) = 9.54.', state: { iteration: '1', labels: '0 0 0 1 1 1 1', centroids: '(1.83, 2.00) · (4.13, 5.38)', inertia: '9.54' }, changed: ['centroids', 'inertia'], log: 'update centroids → inertia 9.54', predict: { question: 'Iteration 2 re-assigns every point to the moved centroids. What happens?', options: ['All points switch clusters', 'No point changes cluster → converged', 'A new centroid is created', 'Inertia increases'], answer: 1, explain: 'Each step can only lower inertia; once assignments stop changing, the centroids stop moving and the algorithm has converged.' } },
    { title: 'Re-assign with the new centroids', edge: 'u-c', packet: 'same labels', narration: 'Every point keeps its cluster, so the centroids would not move again.', state: { iteration: '2', labels: '0 0 0 1 1 1 1', centroids: '(1.83, 2.00) · (4.13, 5.38)', inertia: '9.54' }, changed: ['iteration'], log: 'iteration 2: no change' },
    { title: 'Converged', edge: 'c-d', packet: '2 segments', tone: 'ok', narration: 'Two segments: occasional low spenders and frequent high spenders. Run several initialisations (k-means++) and compare k with the elbow or silhouette score.', log: 'converged after 2 iterations', hl: ['print(km.inertia_)'] },
  ],
  match: /k-means|kmeans|cluster|segmentation/i,
  takeaways: ['K-means alternates assign and update, each lowering inertia.', 'It converges, but possibly to a local minimum: use k-means++ and several restarts.', 'Scale features, and choose k with elbow / silhouette.'],
}

/* ============================================================ 8. backprop */

const BACKPROP: AgentSim = {
  id: 'ml-backprop',
  title: 'One neuron learns: forward pass, loss, backward pass, update',
  framework: 'NumPy',
  group: 'Deep learning',
  module: '09',
  home: '/ml/learn/09',
  level: 'Intermediate',
  summary: 'A sigmoid neuron gets a positive example wrong-ish (p = 0.50); one gradient step raises its confidence to 0.82 and cuts the loss from 0.693 to 0.201.',
  scenario: 'Input x = [1, 2], weights w = [0.5, −0.3], bias b = 0.1, true label y = 1, learning rate 0.5, binary cross-entropy loss.',
  nodes: [
    { id: 'x', label: 'Input x', sub: '[1, 2]', x: 90, y: 200, kind: 'user' },
    { id: 'z', label: 'z = w·x + b', sub: 'linear', x: 280, y: 90, kind: 'tool' },
    { id: 'a', label: 'a = σ(z)', sub: 'sigmoid', x: 480, y: 90, kind: 'llm' },
    { id: 'L', label: 'Loss', sub: '−log a', x: 680, y: 200, kind: 'guard' },
    { id: 'g', label: 'Gradients', sub: 'chain rule', x: 480, y: 310, kind: 'router' },
    { id: 'u', label: 'Update', sub: 'w ← w − η·∂L/∂w', x: 280, y: 310, kind: 'memory' },
  ],
  edges: [
    { id: 'x-z', from: 'x', to: 'z' },
    { id: 'z-a', from: 'z', to: 'a' },
    { id: 'a-L', from: 'a', to: 'L' },
    { id: 'L-g', from: 'L', to: 'g' },
    { id: 'g-u', from: 'g', to: 'u' },
    { id: 'u-z', from: 'u', to: 'z', bend: 30 },
  ],
  code: `z = w @ x + b                      # 0.5·1 + (−0.3)·2 + 0.1 = 0.0
a = 1 / (1 + np.exp(-z))           # 0.5
loss = -np.log(a)                  # y = 1 → 0.693

dz = a - y                         # ∂L/∂z for sigmoid + BCE = −0.5
dw = dz * x                        # [−0.5, −1.0]
db = dz                            # −0.5
w -= 0.5 * dw; b -= 0.5 * db       # w = [0.75, 0.2], b = 0.35`,
  steps: [
    { title: 'Forward: linear part', edge: 'x-z', packet: 'z = 0.0', narration: 'z = 0.5·1 + (−0.3)·2 + 0.1 = 0.0.', state: { z: '0.00', a: '—', loss: '—', dw: '—', w: '[0.50, −0.30]', b: '0.10' }, changed: ['z'], log: 'z = 0.00', hl: ['z = w @ x + b'] },
    { title: 'Forward: activation', edge: 'z-a', packet: 'a = 0.50', narration: 'σ(0) = 0.5: the neuron is undecided about a positive example.', state: { z: '0.00', a: '0.500', loss: '—', dw: '—', w: '[0.50, −0.30]', b: '0.10' }, changed: ['a'], log: 'a = 0.500', hl: ['a = 1 / (1 + np.exp(-z))'] },
    { title: 'Loss', edge: 'a-L', packet: '0.693', narration: 'Binary cross-entropy for y = 1 is −log(0.5) = 0.693.', state: { z: '0.00', a: '0.500', loss: '0.693', dw: '—', w: '[0.50, −0.30]', b: '0.10' }, changed: ['loss'], log: 'loss = 0.693', hl: ['loss = -np.log(a)'], predict: { question: 'For sigmoid + cross-entropy, ∂L/∂z simplifies to a − y. What is it here?', options: ['0.5', '−0.5', '0.693', '1'], answer: 1, explain: 'a − y = 0.5 − 1 = −0.5. Negative means increasing z lowers the loss.' } },
    { title: 'Backward: chain rule', edge: 'L-g', packet: 'dz = −0.5', narration: 'dz = −0.5, then dw = dz·x = [−0.5, −1.0] and db = −0.5. The weight on the larger input gets the larger gradient.', state: { z: '0.00', a: '0.500', loss: '0.693', dw: '[−0.50, −1.00]', w: '[0.50, −0.30]', b: '0.10' }, changed: ['dw'], log: 'dw = [−0.50, −1.00], db = −0.50', hl: ['dz = a - y', 'dw = dz * x'] },
    { title: 'Update', edge: 'g-u', packet: 'step', node: 'u', narration: 'w = [0.5, −0.3] − 0.5·[−0.5, −1.0] = [0.75, 0.20]; b = 0.35.', state: { z: '0.00', a: '0.500', loss: '0.693', dw: '[−0.50, −1.00]', w: '[0.75, 0.20]', b: '0.35' }, changed: ['w', 'b'], log: 'w = [0.75, 0.20], b = 0.35', hl: ['w -= 0.5 * dw'] },
    { title: 'Forward again', edge: 'u-z', packet: 'z = 1.5', node: 'L', tone: 'ok', narration: 'Now z = 1.5, a = 0.818 and the loss drops from 0.693 to 0.201. Deep networks do exactly this, layer by layer, for millions of weights.', state: { z: '1.50', a: '0.818', loss: '0.201', dw: '—', w: '[0.75, 0.20]', b: '0.35' }, changed: ['z', 'a', 'loss'], log: 'after one step: loss 0.201' },
  ],
  match: /backprop|forward & backward|neuron|perceptron|neural network|multi-layer|activation|gradient issues|deep learning loss/i,
  takeaways: ['Forward pass computes predictions; the loss scores them.', 'Backprop applies the chain rule from the loss back to each weight.', 'For sigmoid + cross-entropy, ∂L/∂z = a − y.'],
}

/* ====================================================== 9. threshold tuning */

const THRESHOLD: AgentSim = {
  id: 'ml-threshold',
  title: 'Moving the decision threshold: precision vs recall',
  framework: 'scikit-learn',
  group: 'Evaluation',
  module: '08',
  home: '/ml/learn/08',
  level: 'Beginner',
  summary: 'The same 10 predicted probabilities give very different precision and recall at thresholds 0.5, 0.75 and 0.35.',
  scenario: 'A disease-screening model outputs probabilities for 10 patients; 5 are actually sick. Missing a sick patient is far worse than an extra test.',
  nodes: [
    { id: 'model', label: 'Model', sub: 'predict_proba', x: 100, y: 200, kind: 'llm' },
    { id: 't', label: 'Threshold', sub: 'p ≥ t → positive', x: 320, y: 200, kind: 'router' },
    { id: 'cm', label: 'Confusion matrix', sub: 'TP · FP · FN', x: 540, y: 100, kind: 'tool' },
    { id: 'pr', label: 'Precision / recall', x: 540, y: 300, kind: 'guard' },
    { id: 'dec', label: 'Business decision', x: 750, y: 200, kind: 'end' },
  ],
  edges: [
    { id: 'm-t', from: 'model', to: 't' },
    { id: 't-c', from: 't', to: 'cm' },
    { id: 'c-p', from: 'cm', to: 'pr' },
    { id: 'p-d', from: 'pr', to: 'dec' },
  ],
  code: `proba = model.predict_proba(X_val)[:, 1]
# [0.95, 0.90, 0.80, 0.70, 0.65, 0.55, 0.40, 0.30, 0.20, 0.10]
# truth  1     1     1     0     1     0     1     0     0     0
for t in (0.5, 0.75, 0.35):
    pred = proba >= t
    print(t, precision_score(y_val, pred), recall_score(y_val, pred))`,
  steps: [
    { title: 'Default threshold 0.5', edge: 't-c', packet: 't = 0.5', narration: '6 patients flagged: 4 sick (TP), 2 healthy (FP); 1 sick patient missed (FN).', state: { threshold: '0.50', TP: '4', FP: '2', FN: '1', precision: '0.67', recall: '0.80' }, changed: ['TP', 'FP', 'FN', 'precision', 'recall'], log: 't = 0.50 → P 0.67, R 0.80', hl: ['pred = proba >= t'] },
    { title: 'Stricter: 0.75', edge: 'c-p', packet: 't = 0.75', narration: 'Only 3 flagged, all sick — precision 1.00 — but now 2 sick patients are missed.', state: { threshold: '0.75', TP: '3', FP: '0', FN: '2', precision: '1.00', recall: '0.60' }, changed: ['threshold', 'TP', 'FP', 'FN', 'precision', 'recall'], log: 't = 0.75 → P 1.00, R 0.60', predict: { question: 'For disease screening, which threshold is better?', options: ['0.75 — perfect precision', 'A lower threshold that catches every sick patient', 'Always 0.5', 'The threshold does not matter'], answer: 1, explain: 'A missed diagnosis costs far more than an extra test, so you trade precision for recall.' } },
    { title: 'Looser: 0.35', edge: 'p-d', packet: 't = 0.35', tone: 'ok', narration: 'All 5 sick patients are caught (recall 1.00) at the cost of 2 extra follow-up tests (precision 0.71). Choose the threshold from the cost of each mistake, on validation data.', state: { threshold: '0.35', TP: '5', FP: '2', FN: '0', precision: '0.71', recall: '1.00' }, changed: ['threshold', 'TP', 'FN', 'precision', 'recall'], log: 't = 0.35 → P 0.71, R 1.00' },
  ],
  match: /classification metrics|precision|recall|confusion|threshold|logistic regression|roc|imbalanced/i,
  takeaways: ['0.5 is only a default threshold.', 'Lower thresholds raise recall, higher ones raise precision.', 'Pick the threshold from business costs, on validation data.'],
}

/* ============================================================ 10. MLOps */

const MLOPS: AgentSim = {
  id: 'ml-mlops-drift',
  title: 'From notebook to production — and catching drift',
  framework: 'MLOps',
  group: 'MLOps',
  module: '11',
  home: '/ml/learn/11',
  level: 'Advanced',
  summary: 'Register a model, serve it behind an API, watch a feature drift in production and trigger a retrain.',
  scenario: 'A churn model (AUC 0.86) is deployed. Two months later a pricing change shifts the “monthly_fee” distribution.',
  nodes: [
    { id: 'train', label: 'Training pipeline', sub: 'versioned data', x: 90, y: 200, kind: 'tool' },
    { id: 'reg', label: 'Model registry', sub: 'MLflow', x: 280, y: 90, kind: 'memory' },
    { id: 'api', label: 'Serving API', sub: 'FastAPI + pipeline.pkl', x: 500, y: 90, kind: 'service' },
    { id: 'mon', label: 'Monitoring', sub: 'PSI, AUC, latency', x: 500, y: 310, kind: 'guard' },
    { id: 'alert', label: 'Alert → retrain', x: 280, y: 310, kind: 'human' },
  ],
  edges: [
    { id: 't-r', from: 'train', to: 'reg' },
    { id: 'r-a', from: 'reg', to: 'api' },
    { id: 'a-m', from: 'api', to: 'mon' },
    { id: 'm-al', from: 'mon', to: 'alert' },
    { id: 'al-t', from: 'alert', to: 'train' },
  ],
  code: `with mlflow.start_run():
    pipe.fit(X_train, y_train)
    mlflow.log_metric("val_auc", 0.86)
    mlflow.sklearn.log_model(pipe, "model", registered_model_name="churn")

# serving: load once, validate, predict, log
model = mlflow.sklearn.load_model("models:/churn/Production")

# monitoring job (daily)
psi = population_stability_index(train_df["monthly_fee"], last_7_days["monthly_fee"])
if psi > 0.25:
    alert("monthly_fee drifted", psi=psi)`,
  steps: [
    { title: 'Train and register', edge: 't-r', packet: 'churn v3', narration: 'The whole pipeline (preprocessing + model) is logged with its metrics and registered as version 3.', state: { model: 'churn v3', stage: 'Staging', val_auc: '0.86', psi_monthly_fee: '—', live_auc: '—' }, changed: ['model', 'stage', 'val_auc'], log: 'registered churn v3 (val AUC 0.86)', hl: ['mlflow.sklearn.log_model'] },
    { title: 'Promote and serve', edge: 'r-a', packet: 'Production', narration: 'v3 is promoted to Production; the API loads it once at start-up and applies the same preprocessing as training.', state: { model: 'churn v3', stage: 'Production', val_auc: '0.86', psi_monthly_fee: '0.03', live_auc: '0.85' }, changed: ['stage', 'psi_monthly_fee', 'live_auc'], log: 'serving v3 — PSI 0.03, live AUC 0.85', hl: ['load_model("models:/churn/Production")'] },
    { title: 'Drift appears', edge: 'a-m', packet: 'PSI 0.31', node: 'mon', tone: 'warn', narration: 'A new pricing plan shifts monthly_fee: PSI = 0.31 (above 0.25 = significant shift). Live AUC, measured as labels arrive, falls to 0.78.', state: { model: 'churn v3', stage: 'Production', val_auc: '0.86', psi_monthly_fee: '0.31', live_auc: '0.78' }, changed: ['psi_monthly_fee', 'live_auc'], log: 'monthly_fee PSI 0.31, live AUC 0.78', hl: ['psi = population_stability_index', 'if psi > 0.25'], predict: { question: 'What should happen next?', options: ['Nothing — the model passed validation', 'Alert, investigate the feature, retrain on recent data and compare before promoting', 'Delete the feature in production only', 'Lower the threshold'], answer: 1, explain: 'Changing features only at serving time creates training-serving skew. Retrain on data that reflects the new pricing and promote only if it beats the current model.' } },
    { title: 'Alert and retrain', edge: 'm-al', packet: 'alert', node: 'alert', narration: 'The on-call data scientist confirms the pricing change and triggers retraining on the last 90 days.', log: 'alert raised → retrain triggered' },
    { title: 'New version wins', edge: 'al-t', packet: 'churn v4', node: 'train', tone: 'ok', narration: 'v4 scores AUC 0.85 on recent data versus 0.78 for v3 and is promoted. The loop closes: monitor → retrain → compare → promote.', state: { model: 'churn v4', stage: 'Production', val_auc: '0.85', psi_monthly_fee: '0.04', live_auc: '0.84' }, changed: ['model', 'val_auc', 'psi_monthly_fee', 'live_auc'], log: 'promoted churn v4' },
  ],
  match: /mlops|deploy|serving|production|monitoring|drift|model registry/i,
  takeaways: ['Version data, code and models; promote through a registry.', 'Serve the same pipeline you trained to avoid skew.', 'Monitor drift and live metrics, and close the retraining loop.'],
}

export const ML_SIMS: AgentSim[] = [PIPELINE, GD, TREE, THRESHOLD, FOREST, BOOST, KMEANS, KFOLD, BACKPROP, MLOPS]
