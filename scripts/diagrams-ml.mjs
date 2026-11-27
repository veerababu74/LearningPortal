/**
 * Curated Mermaid diagrams for the VeeraML track. Each is placed on the first Learn lesson (in course
 * order) whose title matches `where.topic` inside `where.module`, next to the section matching
 * `where.section`. Validated by scripts/validate-diagrams.mjs.
 */
export const ML_DIAGRAMS = [
  /* ------------------------------------------------------------ 01 foundations */
  {
    id: 'ml-workflow',
    where: { module: '01', topic: /workflow|mental model|process blueprint/i, section: /workflow|process|step 1|overview/i, fallbackFirst: true },
    title: 'The machine-learning workflow',
    mermaid: `
flowchart LR
  p["Frame the problem: target, metric, baseline"] --> d["Collect and explore data (EDA)"]
  d --> s["Split: train / validation / test"]
  s --> f["Clean and engineer features — fit on train only"]
  f --> m["Train candidate models"]
  m --> e["Evaluate with cross-validation"]
  e -->|"not good enough"| f
  e -->|"good"| t["Final check on the untouched test set"]
  t --> dep["Deploy, monitor, retrain"]
  dep -->|"drift"| d`,
    explain: `ML is a loop, not a line. You frame the problem and pick a metric *before* touching models, split the data early, and learn every preprocessing step from the training split only. Validation results send you back to features or models; the test set is used once at the end, and production monitoring restarts the loop when the data drifts.`,
  },
  {
    id: 'learning-types',
    where: { module: '01', topic: /types of learning/i, section: /comparison|supervised/i, fallbackFirst: true },
    title: 'Which kind of learning is it?',
    mermaid: `
flowchart TD
  q{"Do you have the right answer (label) for each example?"} -->|yes| sup["Supervised learning"]
  sup --> r{"Is the label a number or a category?"}
  r -->|number| reg["Regression — price, demand, temperature"]
  r -->|category| cls["Classification — spam, churn, disease"]
  q -->|no| un["Unsupervised learning"]
  un --> c["Clustering, dimensionality reduction, anomaly detection"]
  q -->|"only a reward after actions"| rl["Reinforcement learning — games, robotics, recommendations"]`,
    explain: `The data decides the family. Labels → **supervised** (regression for numbers, classification for categories). No labels → **unsupervised**, finding structure such as groups or a lower-dimensional view. Feedback that arrives as a reward after a sequence of actions → **reinforcement learning**.`,
  },
  {
    id: 'splits-leakage',
    where: { module: '01', topic: /splits|leakage/i, section: /three-way|split/i, fallbackFirst: true },
    title: 'Train / validation / test — and where leakage sneaks in',
    mermaid: `
flowchart LR
  all[("Full dataset")] --> tr["Train 70% — fit model AND preprocessing"]
  all --> va["Validation 15% — choose model and hyperparameters"]
  all --> te["Test 15% — touch once, report the final score"]
  tr -->|"scaler.fit(train)"| sc["Scaler / encoder / imputer parameters"]
  sc -->|"transform only"| va
  sc -->|"transform only"| te
  bad["scaler.fit(ALL data) before splitting"] -.->|"leaks test statistics into training"| tr`,
    explain: `Every statistic a model or preprocessor learns — means, standard deviations, category lists, imputation values — must come from the training split. Fitting a scaler on the full dataset lets information from the test rows leak into training, so the test score becomes optimistic. Time-series data must also be split by time, never shuffled.`,
  },

  /* ---------------------------------------------------------------- 02 math */
  {
    id: 'vectors-matrices',
    where: { module: '02', topic: /vectors matrices tensors/i, section: /why this matters|vectors/i, fallbackFirst: true },
    title: 'Scalars, vectors, matrices and tensors in ML',
    mermaid: `
flowchart LR
  s["Scalar — one number: a learning rate"] --> v["Vector — 1-D: one house's features"]
  v --> m["Matrix — 2-D: the whole dataset, rows = samples, columns = features"]
  m --> t["Tensor — n-D: a batch of colour images, batch × height × width × channels"]`,
    explain: `Every dataset and every model weight in ML is one of these shapes. A row of features is a vector, a dataset is a matrix, and image or text batches are higher-dimensional tensors. Most bugs in model code are shape mismatches, so always know the shape of what you are multiplying.`,
  },
  {
    id: 'dot-product',
    where: { module: '02', topic: /dot outer transpose/i, section: /dot product/i, fallbackFirst: true },
    title: 'A linear model is a dot product',
    mermaid: `
flowchart LR
  x["features x = [size, rooms, age]"] --> dp(("w · x + b"))
  w["weights w = [0.3, 12, -0.8]"] --> dp
  dp --> y["prediction ŷ = 0.3·size + 12·rooms − 0.8·age + b"]`,
    explain: `The dot product multiplies matching entries and adds them up. A linear regression prediction, one neuron in a neural network and an attention score between a query and a key are all dot products — which is why matrix multiplication (many dot products at once) is the workhorse of ML hardware.`,
  },
  {
    id: 'eigen-pca',
    where: { module: '02', topic: /eigen/i, section: /intuition|why this matters/i, fallbackFirst: true },
    title: 'Eigenvectors: directions a matrix only stretches',
    mermaid: `
flowchart LR
  a["Matrix A, e.g. a covariance matrix"] --> q{"A · v = λ · v ?"}
  q -->|"yes"| e["v is an eigenvector — its direction is unchanged; λ says how much it is stretched"]
  e --> pca["Covariance eigenvectors with the largest λ = directions of largest variance = principal components"]`,
    explain: `Most vectors change direction when a matrix multiplies them; eigenvectors do not — they are only scaled by their eigenvalue λ. For a covariance matrix the eigenvectors point along the directions in which the data varies most, which is exactly what PCA keeps.`,
  },
  {
    id: 'chain-rule',
    where: { module: '02', topic: /derivatives chain rule/i, section: /chain|intuitive|why this matters/i, fallbackFirst: true },
    title: 'The chain rule is how gradients flow',
    mermaid: `
flowchart LR
  x["x"] --> g["u = g(x)"] --> f["L = f(u)"]
  f -.->|"dL/du"| g
  g -.->|"du/dx"| x
  r["dL/dx = dL/du × du/dx"]`,
    explain: `A model is a chain of functions, so the derivative of the loss with respect to an early variable is the product of the local derivatives along the chain. Backpropagation is just the chain rule applied from the loss backwards through every layer, reusing the products it has already computed.`,
  },
  {
    id: 'gradient-descent',
    where: { module: '02', topic: /optimization basics/i, section: /gradient descent/i, fallbackFirst: true },
    title: 'Gradient descent, one step at a time',
    mermaid: `
flowchart TD
  init["Start with random weights w"] --> loss["Compute the loss L(w) on a batch"]
  loss --> grad["Compute the gradient ∇L(w) — the uphill direction"]
  grad --> step["w ← w − η · ∇L(w) — step downhill, η = learning rate"]
  step --> conv{"Loss stopped improving?"}
  conv -->|no| loss
  conv -->|yes| done["Trained weights"]`,
    explain: `The gradient points in the direction of steepest increase, so stepping against it lowers the loss. The learning rate η sets the step size: too small and training crawls, too large and it overshoots and diverges. Batch, mini-batch and stochastic variants differ only in how many examples they use to estimate the gradient.`,
  },
  {
    id: 'bayes',
    where: { module: '02', topic: /bayes/i, section: /bayes' theorem|bayes theorem/i, fallbackFirst: true },
    title: "Bayes' theorem: updating a belief with evidence",
    mermaid: `
flowchart LR
  prior["Prior P(disease) = 1%"] --> post(("P(disease | positive) = P(positive | disease) · P(disease) / P(positive)"))
  like["Likelihood P(positive | disease) = 90%"] --> post
  ev["Evidence P(positive) = 0.9·1% + 5%·99% ≈ 5.9%"] --> post
  post --> res["Posterior ≈ 15% — a positive test is far from certain when the disease is rare"]`,
    explain: `Bayes' theorem turns "how likely is the evidence if the hypothesis is true" into "how likely is the hypothesis given the evidence". Rare conditions stay fairly unlikely even after a positive test because false positives from the large healthy group dominate. Naive Bayes classifiers and Bayesian inference are built on this rule.`,
  },
  {
    id: 'mle',
    where: { module: '02', topic: /mle|likelihood/i, section: /maximum likelihood|mle/i, fallbackFirst: true },
    title: 'Maximum likelihood → the loss functions you already use',
    mermaid: `
flowchart LR
  a["Assume a noise model for the data"] --> b["Write the likelihood of the training data"]
  b --> c["Maximise log-likelihood = minimise negative log-likelihood"]
  c --> g["Gaussian noise → mean squared error"]
  c --> bern["Bernoulli labels → binary cross-entropy"]
  c --> map["Add a prior on weights (MAP) → L2 or L1 regularisation"]`,
    explain: `Common losses are not arbitrary: minimising MSE is maximum-likelihood estimation under Gaussian noise, and cross-entropy is maximum likelihood for categorical labels. Adding a Gaussian or Laplace prior on the weights (MAP) produces exactly the L2 and L1 regularisation terms.`,
  },
  {
    id: 'clt',
    where: { module: '02', topic: /clt|central limit/i, section: /central limit/i, fallbackFirst: true },
    title: 'Central limit theorem',
    mermaid: `
flowchart LR
  pop["Any population — skewed, bimodal, uniform"] --> samp["Draw many samples of size n"]
  samp --> means["Compute the mean of each sample"]
  means --> normal["The sample means form a bell curve around the true mean, spread σ/√n"]
  normal --> use["Basis for confidence intervals, A/B tests and error bars"]`,
    explain: `Whatever the shape of the original data, averages of large enough samples are approximately normally distributed, and their spread shrinks with √n. That is why confidence intervals and significance tests on model metrics work even when individual errors are not normal.`,
  },
  {
    id: 'entropy',
    where: { module: '02', topic: /^.*entropy - measuring/i, section: /intuition|definition/i, fallbackFirst: true },
    title: 'Entropy, cross-entropy and KL divergence',
    mermaid: `
flowchart LR
  h["Entropy H(p): average surprise of the true distribution"] --> ce["Cross-entropy H(p, q): surprise when you predict q but the truth is p"]
  ce --> kl["KL(p || q) = H(p, q) − H(p): the extra cost of using q"]
  ce --> loss["Classification loss: minimising cross-entropy pushes q toward p"]`,
    explain: `Entropy measures uncertainty; a fair coin has more than a loaded one. Cross-entropy measures how well a predicted distribution q encodes the true one p, and KL divergence is the gap between them. Training a classifier with cross-entropy loss is minimising that gap for every example.`,
  },

  /* ------------------------------------------------------- 03 data preparation */
  {
    id: 'scaling-choice',
    where: { module: '03', topic: /feature scaling/i, section: /scaling techniques|decision tree|which/i, fallbackFirst: true },
    title: 'Choosing a scaler',
    mermaid: `
flowchart TD
  q{"Does the model use distances or gradients? (KNN, SVM, linear, neural nets, PCA)"} -->|no — trees, forests, boosting| none["Scaling is not needed"]
  q -->|yes| o{"Strong outliers?"}
  o -->|yes| rob["RobustScaler — median and IQR"]
  o -->|no| b{"Need a fixed 0–1 range, e.g. pixels?"}
  b -->|yes| mm["MinMaxScaler"]
  b -->|no| std["StandardScaler — mean 0, std 1"]`,
    explain: `Features measured in different units dominate distance and gradient calculations unless they are rescaled. Tree-based models split on one feature at a time, so they do not care. Whatever you pick, fit the scaler on the training split only and reuse it for validation, test and production data.`,
  },
  {
    id: 'encoding-choice',
    where: { module: '03', topic: /encoding categorical/i, section: /decision flowchart|encoding techniques/i, fallbackFirst: true },
    title: 'Encoding categorical variables',
    mermaid: `
flowchart TD
  q{"Do the categories have a natural order? (low < medium < high)"} -->|yes| ord["Ordinal encoding: 0, 1, 2"]
  q -->|no| c{"How many distinct values?"}
  c -->|"few, under about 15"| oh["One-hot encoding"]
  c -->|"many — city, product id"| hi["Target / frequency encoding or embeddings — with cross-validation to avoid leakage"]`,
    explain: `Models need numbers. Ordinal encoding keeps a real order; one-hot encoding avoids inventing a fake order for nominal categories but explodes with many values. For high-cardinality features, target encoding is powerful but must be computed out-of-fold, otherwise it leaks the label.`,
  },
  {
    id: 'missing-values',
    where: { module: '03', topic: /missing values/i, section: /strategy|comparison/i, fallbackFirst: true },
    title: 'Handling missing values',
    mermaid: `
flowchart TD
  m["Column with missing values"] --> why{"Why is it missing?"}
  why -->|"random, few rows"| drop["Drop rows or impute the median"]
  why -->|"meaningful — no loan → no loan amount"| flag["Impute AND add an is_missing flag"]
  why -->|"related to other features"| adv["KNN or iterative imputation"]
  drop --> fit["Fit the imputer on train only, inside a Pipeline"]
  flag --> fit
  adv --> fit`,
    explain: `Missingness often carries information, so a simple indicator column can be one of the most useful features. Whatever imputation you choose, it is a learned transformation: fit it on the training folds only, ideally inside a scikit-learn Pipeline so cross-validation stays honest.`,
  },
  {
    id: 'outliers',
    where: { module: '03', topic: /outlier/i, section: /detecting|treating/i, fallbackFirst: true },
    title: 'Detecting and treating outliers',
    mermaid: `
flowchart LR
  d["Feature values"] --> det{"Detect"}
  det --> iqr["IQR rule: below Q1 − 1.5·IQR or above Q3 + 1.5·IQR"]
  det --> z["Z-score above 3 (roughly normal data)"]
  det --> iso["Isolation Forest (many features)"]
  iqr --> tr{"Error or real?"}
  z --> tr
  iso --> tr
  tr -->|"data error"| fix["Fix or remove"]
  tr -->|"real but extreme"| cap["Cap / winsorise, log-transform, or use a robust model"]`,
    explain: `First decide whether an outlier is a mistake or a rare but real value. Errors are fixed or removed; real extremes are usually kept but tamed with capping, a log transform or models and losses that are less sensitive to them (trees, Huber loss).`,
  },
  {
    id: 'imbalance',
    where: { module: '03', topic: /imbalanced/i, section: /resampling|solution|why imbalanced/i, fallbackFirst: true },
    title: 'Fixing class imbalance',
    mermaid: `
flowchart TD
  p["99% legitimate, 1% fraud"] --> m["Switch metric: precision, recall, F1, PR-AUC — not accuracy"]
  m --> w["Class weights — cheapest first step"]
  m --> rs["Resampling on the training folds only: SMOTE, undersampling"]
  m --> th["Move the decision threshold to trade precision for recall"]`,
    explain: `With 1% positives, predicting "never fraud" scores 99% accuracy and catches nothing, so change the metric first. Then try class weights, resampling such as SMOTE (only inside the training folds, never before splitting) and threshold tuning against the business cost of false positives and false negatives.`,
  },
  {
    id: 'pipeline',
    where: { module: '03', topic: /pipeline|fit, transform/i, section: /.*/i, fallbackFirst: true },
    title: 'fit / transform / predict inside a Pipeline',
    mermaid: `
flowchart LR
  subgraph TR["Training data"]
    f1["imputer.fit_transform"] --> f2["scaler.fit_transform"] --> f3["model.fit"]
  end
  subgraph NEW["Validation, test, production"]
    t1["imputer.transform"] --> t2["scaler.transform"] --> t3["model.predict"]
  end
  TR -.->|"same learned parameters"| NEW`,
    explain: `fit learns parameters, transform applies them, fit_transform does both on training data. New data must only be transformed with the parameters learned in training. A Pipeline bundles the steps so cross-validation refits everything per fold and production applies exactly the same preprocessing.`,
  },

  /* ---------------------------------------------------------------- 04 regression */
  {
    id: 'linear-regression',
    where: { module: '04', topic: /linear regression/i, section: /intuition|mathematical/i, fallbackFirst: true },
    title: 'Linear regression: fit a line by minimising squared error',
    mermaid: `
flowchart LR
  data["(x, y) pairs"] --> model["ŷ = w·x + b"]
  model --> res["Residuals: y − ŷ for every point"]
  res --> mse["MSE = mean of squared residuals"]
  mse --> solve["Solve: normal equation or gradient descent"]
  solve --> model`,
    explain: `Linear regression chooses the weights that minimise the mean squared vertical distance between the points and the line. It can be solved in closed form with the normal equation or iteratively with gradient descent; its coefficients are directly interpretable as the effect of one unit of each feature.`,
  },
  {
    id: 'bias-variance',
    where: { module: '04', topic: /bias-variance/i, section: /tradeoff|decomposition/i, fallbackFirst: true },
    title: 'The bias-variance tradeoff',
    mermaid: `
flowchart LR
  simple["Too simple — high bias: underfits, train and test error both high"] --> just["Just right — lowest test error"]
  just --> complex["Too complex — high variance: overfits, train error low, test error high"]
  simple -.->|"add features, less regularisation, more capacity"| just
  complex -.->|"more data, regularisation, simpler model, ensembling"| just`,
    explain: `Expected error = bias² + variance + irreducible noise. Bias is error from wrong assumptions, variance is sensitivity to the particular training sample. Increasing model capacity lowers bias but raises variance; the goal is the sweet spot, found with validation curves and cross-validation.`,
  },
  {
    id: 'ridge-lasso',
    where: { module: '04', topic: /ridge|lasso|elastic/i, section: /ridge vs lasso|elastic net|ridge regression/i, fallbackFirst: true },
    title: 'Ridge vs Lasso vs Elastic Net',
    mermaid: `
flowchart TD
  loss["Loss = MSE + α · penalty"] --> r["Ridge (L2): penalty = Σw² — shrinks all weights, keeps every feature"]
  loss --> l["Lasso (L1): penalty = Σ|w| — drives some weights to exactly 0, selects features"]
  loss --> e["Elastic Net: L1 + L2 — selection that stays stable with correlated features"]
  r --> a["Choose α by cross-validation; scale features first"]
  l --> a
  e --> a`,
    explain: `Regularisation adds a cost for large weights so the model cannot overfit noise. L2 spreads the shrinkage over all weights; L1's corners make many weights exactly zero, giving automatic feature selection. Because the penalty depends on weight size, features must be on the same scale.`,
  },
  {
    id: 'loss-functions',
    where: { module: '04', topic: /regression loss/i, section: /common|when to use/i, fallbackFirst: true },
    title: 'Regression losses and their behaviour',
    mermaid: `
flowchart LR
  mse["MSE — squares errors: punishes big misses, sensitive to outliers"] --> h["Huber — MSE near zero, MAE far away: robust and smooth"]
  mae["MAE — absolute errors: robust, predicts the median"] --> h
  h --> q["Quantile loss — predict a percentile, e.g. P90 delivery time"]`,
    explain: `The loss decides what "best" means. MSE predicts the mean and lets a few large errors dominate; MAE predicts the median and ignores how far outliers are; Huber blends both. Quantile loss lets you predict upper or lower bounds instead of a single point.`,
  },

  /* ------------------------------------------------------------ 05 classification */
  {
    id: 'logistic',
    where: { module: '05', topic: /logistic regression/i, section: /logistic function|sigmoid|decision boundary/i, fallbackFirst: true },
    title: 'Logistic regression: linear score → probability → class',
    mermaid: `
flowchart LR
  x["features x"] --> z["z = w·x + b — any real number"]
  z --> s["σ(z) = 1 / (1 + e^−z) — probability between 0 and 1"]
  s --> t{"p ≥ threshold (default 0.5)?"}
  t -->|yes| one["class 1"]
  t -->|no| zero["class 0"]
  s --> bce["trained by minimising binary cross-entropy"]`,
    explain: `Logistic regression computes a linear score and squashes it through the sigmoid into a probability. The decision boundary w·x + b = 0 is linear. The 0.5 threshold is only a default: move it to trade precision against recall for your problem.`,
  },
  {
    id: 'confusion',
    where: { module: '08', topic: /classification metrics/i, section: /confusion matrix/i, fallbackFirst: true },
    title: 'Confusion matrix → precision, recall, F1',
    mermaid: `
flowchart TD
  cm["Predictions vs truth"] --> tp["TP — predicted positive, really positive"]
  cm --> fp["FP — predicted positive, really negative (false alarm)"]
  cm --> fn["FN — predicted negative, really positive (missed)"]
  cm --> tn["TN — predicted negative, really negative"]
  tp --> p["Precision = TP / (TP + FP): how many alarms were real?"]
  fp --> p
  tp --> r["Recall = TP / (TP + FN): how many positives did we catch?"]
  fn --> r
  p --> f1["F1 = harmonic mean of precision and recall"]
  r --> f1`,
    explain: `Accuracy hides which mistakes a model makes. Precision matters when false alarms are expensive (spam filters), recall when misses are expensive (cancer screening, fraud). ROC-AUC and PR-AUC summarise performance across all thresholds; PR-AUC is more informative when positives are rare.`,
  },
  {
    id: 'knn',
    where: { module: '05', topic: /nearest neighbo|knn/i, section: /how knn works|choosing k/i, fallbackFirst: true },
    title: 'K-nearest neighbours',
    mermaid: `
flowchart LR
  q["New point"] --> d["Distance to every training point (features scaled!)"]
  d --> k["Keep the k closest"]
  k --> v{"Task"}
  v -->|classification| vote["Majority vote of their labels"]
  v -->|regression| avg["Average of their values"]
  k -.->|"small k: noisy, high variance — large k: smooth, high bias"| v`,
    explain: `KNN stores the training set and predicts from the most similar examples. It has no training step but slow prediction, it breaks down in very high dimensions, and it needs scaled features because distances are computed across all of them. k controls the bias-variance tradeoff.`,
  },
  {
    id: 'svm',
    where: { module: '05', topic: /support vector/i, section: /maximum margin|kernel/i, fallbackFirst: true },
    title: 'SVM: maximum margin and the kernel trick',
    mermaid: `
flowchart TD
  data["Two classes"] --> lin{"Linearly separable?"}
  lin -->|yes| mm["Pick the boundary with the widest margin — defined only by the support vectors"]
  lin -->|"almost"| soft["Soft margin: C trades margin width against misclassified points"]
  lin -->|no| ker["Kernel trick (RBF, polynomial): separate in a higher-dimensional space without computing it"]
  ker --> g["RBF γ: high = wiggly boundary (overfit), low = smooth"]`,
    explain: `Among all boundaries that separate the classes, SVM chooses the one farthest from the nearest points, which generalises well. C controls how much it tolerates violations, and kernels let it draw non-linear boundaries. Scale your features: margins are distances.`,
  },
  {
    id: 'decision-tree',
    where: { module: '05', topic: /decision tree/i, section: /how decision trees|impurity|information gain/i, fallbackFirst: true },
    title: 'How a decision tree chooses a split',
    mermaid: `
flowchart TD
  node["Node with mixed labels"] --> try["Try every feature and threshold"]
  try --> imp["Measure child impurity — Gini or entropy"]
  imp --> best["Keep the split with the largest impurity drop (information gain)"]
  best --> stop{"Stop? max_depth, min_samples_leaf, pure node"}
  stop -->|no| node
  stop -->|yes| leaf["Leaf predicts the majority class or mean value"]`,
    explain: `A tree greedily asks the yes/no question that best separates the labels, then repeats on each side. Grown without limits it memorises the training data, so depth and leaf-size limits or pruning are essential. Trees need no scaling and are easy to explain, which also makes them the building block of forests and boosting.`,
  },
  {
    id: 'naive-bayes',
    where: { module: '05', topic: /naive bayes/i, section: /naive|bayes' theorem/i, fallbackFirst: true },
    title: 'Naive Bayes for spam detection',
    mermaid: `
flowchart LR
  email["Email words: free, winner, meeting"] --> l["Multiply P(word | spam) for each word × P(spam)"]
  email --> h["Multiply P(word | ham) for each word × P(ham)"]
  l --> c{"Larger score?"}
  h --> c
  c --> out["Predicted class"]
  sm["Laplace smoothing: unseen words do not zero everything out"] -.-> l`,
    explain: `Naive Bayes applies Bayes' theorem with the "naive" assumption that features are independent given the class, so it multiplies per-feature probabilities. The assumption is wrong for real text, yet the ranking of classes is often right, making it a fast, strong baseline for text classification.`,
  },

  /* ----------------------------------------------------------------- 06 ensembles */
  {
    id: 'bagging-vs-boosting',
    where: { module: '06', topic: /ensemble methods|bagging|random forest/i, section: /wisdom|overview|bagging/i, fallbackFirst: true },
    title: 'Bagging vs boosting',
    mermaid: `
flowchart TB
  subgraph B["Bagging — parallel, reduces variance"]
    d1["Bootstrap sample 1"] --> m1["Deep tree 1"]
    d2["Bootstrap sample 2"] --> m2["Deep tree 2"]
    d3["Bootstrap sample 3"] --> m3["Deep tree 3"]
    m1 --> avg["Average / vote"]
    m2 --> avg
    m3 --> avg
  end
  subgraph S["Boosting — sequential, reduces bias"]
    w1["Weak learner 1"] --> e1["Focus on its errors"] --> w2["Weak learner 2"] --> e2["Focus on remaining errors"] --> w3["Weak learner 3"]
    w3 --> sum["Weighted sum"]
  end`,
    explain: `Bagging trains many strong, overfitting models on different bootstrap samples in parallel and averages them, cancelling out their variance. Boosting trains weak models one after another, each correcting what the previous ones got wrong, which reduces bias but can overfit if you add too many rounds.`,
  },
  {
    id: 'random-forest',
    where: { module: '06', topic: /random forest/i, section: /two sources|algorithm|randomness/i, fallbackFirst: true },
    title: 'Random forest: two kinds of randomness',
    mermaid: `
flowchart LR
  data[("Training data")] --> bs["Bootstrap rows for each tree"]
  bs --> feat["At each split consider only a random subset of features (max_features)"]
  feat --> trees["Hundreds of decorrelated deep trees"]
  trees --> vote["Majority vote / average"]
  bs --> oob["Rows left out of a tree's sample give a free out-of-bag score"]`,
    explain: `Bootstrapping rows makes the trees different; restricting the features at each split makes them *decorrelated*, so their errors cancel when averaged. More trees never overfit — they only cost time. Out-of-bag predictions give a validation score without a separate split.`,
  },
  {
    id: 'gradient-boosting',
    where: { module: '06', topic: /gradient boosting/i, section: /how gradient boosting|why it's called/i, fallbackFirst: true },
    title: 'Gradient boosting fits the residuals',
    mermaid: `
flowchart TD
  f0["F0 = mean of y"] --> r1["Residuals r = y − F0 (the negative gradient of the loss)"]
  r1 --> t1["Fit a small tree h1 to the residuals"]
  t1 --> f1["F1 = F0 + η · h1"]
  f1 --> r2["New residuals y − F1"]
  r2 --> t2["Fit h2 …"]
  t2 --> fm["F_M = F0 + η · Σ h_m — stop with early stopping on validation"]`,
    explain: `Each new tree predicts what the current ensemble still gets wrong. For squared error the residual is exactly the negative gradient, hence "gradient" boosting; other losses use their own gradients. A small learning rate η with more trees and early stopping generalises best. XGBoost, LightGBM and CatBoost add regularisation and much faster split finding.`,
  },
  {
    id: 'adaboost',
    where: { module: '06', topic: /adaboost/i, section: /how adaboost|visual walkthrough/i, fallbackFirst: true },
    title: 'AdaBoost re-weights the mistakes',
    mermaid: `
flowchart LR
  w["Equal sample weights"] --> s["Train a stump"]
  s --> e["Weighted error ε"]
  e --> a["Learner weight α = ½ ln((1 − ε) / ε)"]
  a --> up["Increase weights of misclassified samples"]
  up --> s
  a --> fin["Final: sign of Σ α · stump(x)"]`,
    explain: `AdaBoost makes each new weak learner concentrate on the examples the previous ones misclassified by increasing their weights, and gives accurate learners a bigger say in the final vote. Because hard examples get ever larger weights, it is sensitive to label noise and outliers.`,
  },

  /* ---------------------------------------------------------------- 07 unsupervised */
  {
    id: 'kmeans',
    where: { module: '07', topic: /k-means/i, section: /algorithm/i, fallbackFirst: true },
    title: 'K-means: assign, update, repeat',
    mermaid: `
flowchart TD
  init["Pick k initial centroids (k-means++)"] --> assign["Assign every point to its nearest centroid"]
  assign --> update["Move each centroid to the mean of its points"]
  update --> conv{"Assignments changed?"}
  conv -->|yes| assign
  conv -->|no| done["Clusters — choose k with the elbow or silhouette score"]`,
    explain: `K-means alternates two simple steps that each lower the within-cluster sum of squared distances, so it always converges — but possibly to a local minimum, hence k-means++ initialisation and several restarts. It assumes roughly round, similar-sized clusters and needs scaled features.`,
  },
  {
    id: 'dbscan',
    where: { module: '07', topic: /dbscan/i, section: /core concepts|algorithm/i, fallbackFirst: true },
    title: 'DBSCAN: clusters are dense regions',
    mermaid: `
flowchart LR
  p["Point"] --> n{"At least min_samples neighbours within eps?"}
  n -->|yes| core["Core point — starts or grows a cluster"]
  n -->|"no, but near a core point"| border["Border point — joins that cluster"]
  n -->|"no, and isolated"| noise["Noise / outlier"]`,
    explain: `DBSCAN connects points that sit in dense neighbourhoods, so it finds clusters of any shape, does not need k, and labels sparse points as noise. Its weakness is clusters of very different densities, since one eps has to fit them all; a k-distance plot helps choose eps.`,
  },
  {
    id: 'hierarchical',
    where: { module: '07', topic: /hierarchical/i, section: /two approaches|linkage|dendrogram/i, fallbackFirst: true },
    title: 'Agglomerative clustering and the dendrogram',
    mermaid: `
flowchart BT
  a["A"] --> ab["merge A+B (closest)"]
  b["B"] --> ab
  c["C"] --> cd["merge C+D"]
  d["D"] --> cd
  ab --> all["merge AB + CD"]
  cd --> all
  cut["Cut the dendrogram at a height → number of clusters"] -.-> all`,
    explain: `Agglomerative clustering starts with every point alone and repeatedly merges the two closest clusters; the linkage (single, complete, average, Ward) defines "closest". The dendrogram records every merge, so you can choose the number of clusters afterwards by cutting it at a height.`,
  },
  {
    id: 'pca',
    where: { module: '07', topic: /pca|principal component/i, section: /algorithm|what is pca/i, fallbackFirst: true },
    title: 'PCA step by step',
    mermaid: `
flowchart LR
  x["Data matrix X"] --> c["Standardise each feature"]
  c --> cov["Covariance matrix"]
  cov --> eig["Eigenvectors sorted by eigenvalue (or SVD of X)"]
  eig --> k["Keep the top k components — e.g. 95% explained variance"]
  k --> proj["Project: X · W_k → fewer, uncorrelated features"]`,
    explain: `PCA rotates the data onto new axes ordered by how much variance they capture and drops the weakest ones. It speeds up models, removes correlated features and enables 2-D plots, but the new features are mixtures of the originals and harder to explain. Fit it on training data only.`,
  },

  /* ---------------------------------------------------------- 08 evaluation */
  {
    id: 'kfold',
    where: { module: '08', topic: /cross-validation/i, section: /k-fold/i, fallbackFirst: true },
    title: '5-fold cross-validation',
    mermaid: `
flowchart TB
  d[("Training data split into 5 folds")] --> r1["Round 1: validate on fold 1, train on 2–5"]
  d --> r2["Round 2: validate on fold 2, train on 1, 3–5"]
  d --> r3["…"]
  d --> r5["Round 5: validate on fold 5, train on 1–4"]
  r1 --> s["Mean ± std of the 5 scores"]
  r2 --> s
  r3 --> s
  r5 --> s`,
    explain: `Every example is used for validation exactly once, so the estimate is less dependent on one lucky split, and the standard deviation shows how stable the model is. Use StratifiedKFold for imbalanced classes, GroupKFold when rows from the same user must stay together, and TimeSeriesSplit for temporal data.`,
  },
  {
    id: 'learning-curves',
    where: { module: '08', topic: /learning curves/i, section: /diagnosing|learning curve/i, fallbackFirst: true },
    title: 'Reading learning curves',
    mermaid: `
flowchart TD
  lc["Plot train and validation score vs training-set size"] --> q{"What do you see?"}
  q -->|"both low and close together"| hb["High bias: more features, more capacity, less regularisation"]
  q -->|"train high, validation low, big gap"| hv["High variance: more data, regularisation, simpler model"]
  q -->|"both high, small gap"| ok["Good fit — more data will not help much"]`,
    explain: `Learning curves tell you whether to spend effort on data or on the model. A persistent gap means the model is memorising and more data or regularisation will help; two low, converged curves mean the model is too simple and more data will not fix it.`,
  },
  {
    id: 'tuning',
    where: { module: '08', topic: /hyperparameter tuning/i, section: /which method|grid search|method/i, fallbackFirst: true },
    title: 'Hyperparameter search strategies',
    mermaid: `
flowchart LR
  space["Search space"] --> g["Grid search — every combination; fine for 2–3 parameters"]
  space --> r["Random search — sample combinations; better for many parameters"]
  space --> b["Bayesian (Optuna) — learns from past trials where to look next"]
  g --> cv["Score each candidate with cross-validation"]
  r --> cv
  b --> cv
  cv --> best["Refit the best on all training data, report on test once"]`,
    explain: `Hyperparameters are set before training (depth, learning rate, C). Grid search is exhaustive but explodes combinatorially; random search covers important dimensions better for the same budget; Bayesian optimisation spends trials where results look promising. Tuning against the test set leaks it — use nested CV if you need an unbiased estimate.`,
  },
  {
    id: 'regression-metrics',
    where: { module: '08', topic: /regression metrics/i, section: /core|mae vs rmse/i, fallbackFirst: true },
    title: 'Which regression metric?',
    mermaid: `
flowchart TD
  q{"What matters to the business?"} -->|"average error in the target's units"| mae["MAE"]
  q -->|"big misses are especially bad"| rmse["RMSE"]
  q -->|"relative error across very different scales"| mape["MAPE (careful near zero)"]
  q -->|"share of variance explained"| r2["R² (can be negative on test data)"]`,
    explain: `MAE is easy to explain and robust; RMSE penalises large errors more; MAPE expresses error as a percentage but explodes when true values are near zero; R² compares the model with always predicting the mean. Report the metric that matches the cost of mistakes.`,
  },

  /* ------------------------------------------------------------ 09 deep learning */
  {
    id: 'perceptron',
    where: { module: '09', topic: /neuron|perceptron/i, section: /mathematical model|artificial/i, fallbackFirst: true },
    title: 'One artificial neuron',
    mermaid: `
flowchart LR
  x1["x1"] -->|w1| sum(("Σ wi·xi + b"))
  x2["x2"] -->|w2| sum
  x3["x3"] -->|w3| sum
  sum --> act["activation f — ReLU, sigmoid, tanh"]
  act --> out["output"]`,
    explain: `A neuron is a weighted sum plus a bias followed by a non-linear activation. Without the activation, stacking layers would still produce a linear model; with it, a network of neurons can approximate very complex functions.`,
  },
  {
    id: 'backprop',
    where: { module: '09', topic: /forward & backward|backprop/i, section: /forward propagation|backward/i, fallbackFirst: true },
    title: 'Forward pass, loss, backward pass, update',
    mermaid: `
sequenceDiagram
  participant X as Input batch
  participant N as Network layers
  participant L as Loss
  participant O as Optimizer
  X->>N: forward pass — activations layer by layer
  N->>L: predictions vs labels
  L-->>N: backward pass — dL/dw via the chain rule, last layer first
  N->>O: gradients for every weight
  O->>N: update weights, e.g. Adam step
  Note over X,O: repeat for every mini-batch, many epochs`,
    explain: `Training is a loop of four steps. The forward pass computes predictions and caches activations, the loss scores them, backpropagation applies the chain rule backwards to get each weight's gradient, and the optimizer updates the weights. In PyTorch: \`loss.backward()\` then \`optimizer.step()\` and \`optimizer.zero_grad()\`.`,
  },
  {
    id: 'activations',
    where: { module: '09', topic: /activation functions/i, section: /why activation|complete/i, fallbackFirst: true },
    title: 'Choosing an activation',
    mermaid: `
flowchart TD
  q{"Where in the network?"} -->|"hidden layers"| relu["ReLU (or GELU in transformers) — fast, no saturation for x > 0"]
  q -->|"binary output"| sig["Sigmoid → probability"]
  q -->|"multi-class output"| soft["Softmax → distribution over classes"]
  q -->|"regression output"| lin["Linear (no activation)"]
  relu --> dead["Dead neurons? try Leaky ReLU"]`,
    explain: `Hidden layers need a non-linearity that keeps gradients alive — ReLU and its variants do, while sigmoid and tanh saturate and cause vanishing gradients in deep stacks. The output activation is chosen by the task: sigmoid, softmax or none.`,
  },
  {
    id: 'vanishing',
    where: { module: '09', topic: /gradient issues|vanishing/i, section: /vanishing|solution/i, fallbackFirst: true },
    title: 'Vanishing and exploding gradients',
    mermaid: `
flowchart LR
  deep["Gradient at layer 1 = product of many layer derivatives"] --> small["Factors below 1 → vanishes → early layers stop learning"]
  deep --> big["Factors above 1 → explodes → NaN losses"]
  small --> fix1["ReLU, He init, batch norm, residual connections"]
  big --> fix2["Gradient clipping, lower learning rate, proper init"]`,
    explain: `Backpropagation multiplies one derivative per layer, so in deep networks the product can shrink toward zero or blow up. Modern architectures counter this with ReLU-style activations, careful initialisation, normalisation layers and residual connections; gradient clipping guards against explosions, especially in RNNs.`,
  },
  {
    id: 'optimizers',
    where: { module: '09', topic: /advanced optimizers/i, section: /adam|momentum/i, fallbackFirst: true },
    title: 'From SGD to Adam',
    mermaid: `
flowchart LR
  sgd["SGD: w ← w − η·g"] --> mom["Momentum: keep a running average of gradients — smooths zig-zags"]
  mom --> rms["RMSProp: divide by a running average of g² — per-parameter step sizes"]
  rms --> adam["Adam = momentum + RMSProp + bias correction"]
  adam --> adamw["AdamW: decoupled weight decay — the default for transformers"]`,
    explain: `Plain SGD uses one step size for every weight and oscillates in narrow valleys. Momentum averages the direction, RMSProp adapts the step per parameter, and Adam combines both. AdamW applies weight decay correctly and is the usual default; well-tuned SGD with momentum can still generalise better for some vision tasks.`,
  },
  {
    id: 'cnn',
    where: { module: '09', topic: /convolution/i, section: /what is convolution|2d convolution/i, fallbackFirst: true },
    title: 'A convolutional network',
    mermaid: `
flowchart LR
  img["Image 224×224×3"] --> c1["Conv + ReLU — small filters detect edges"]
  c1 --> p1["Pooling — halve the size"]
  p1 --> c2["Conv + ReLU — textures, parts"]
  c2 --> p2["Pooling"]
  p2 --> c3["Deeper convs — objects"]
  c3 --> fc["Global pooling + dense layer"]
  fc --> out["Class probabilities"]`,
    explain: `Convolutions slide the same small filter over the whole image, so they share weights and detect a pattern wherever it appears. Stacking them builds a hierarchy from edges to objects while pooling shrinks the spatial size. Transfer learning reuses these learned filters from a model trained on a large dataset.`,
  },
  {
    id: 'lstm',
    where: { module: '09', topic: /lstm|rnn/i, section: /lstm|rnn architecture/i, fallbackFirst: true },
    title: 'RNNs and the LSTM memory cell',
    mermaid: `
flowchart LR
  x1["x1"] --> h1["hidden state h1"]
  h1 --> h2["h2"]
  x2["x2"] --> h2
  h2 --> h3["h3"]
  x3["x3"] --> h3
  h3 --> y["output"]
  lstm["LSTM gates — forget, input, output — decide what the cell state keeps"] -.-> h2`,
    explain: `An RNN reads a sequence one step at a time, carrying a hidden state forward, but plain RNNs forget long-range information because gradients vanish over many steps. LSTMs and GRUs add gates that learn what to keep and what to forget. Transformers have largely replaced them by attending to all positions at once.`,
  },
  {
    id: 'attention',
    where: { module: '09', topic: /self-attention|transformer/i, section: /mathemat|intuition|multi-head/i, fallbackFirst: true },
    title: 'Scaled dot-product attention',
    mermaid: `
flowchart LR
  x["token embeddings"] --> q["Q = X·Wq"]
  x --> k["K = X·Wk"]
  x --> v["V = X·Wv"]
  q --> s["scores = Q·Kᵀ / √d_k"]
  k --> s
  s --> sm["softmax → attention weights per token"]
  sm --> o["output = weights · V"]
  v --> o`,
    explain: `Each token builds a query, compares it with every token's key, turns the similarities into weights with softmax and takes the weighted sum of their values. Dividing by √d_k keeps the softmax from saturating. Multi-head attention runs several of these in parallel so different heads can track different relationships.`,
  },
  {
    id: 'gan-vae',
    where: { module: '09', topic: /generative models/i, section: /gan|vae|diffusion/i, fallbackFirst: true },
    title: 'GANs, VAEs and diffusion models',
    mermaid: `
flowchart TB
  gan["GAN: generator makes fakes, discriminator spots them — trained against each other"]
  vae["VAE: encoder → latent distribution → decoder; sample the latent space to generate"]
  dif["Diffusion: learn to remove noise step by step; start from pure noise to generate"]
  gan --> use["Sharp images, unstable training"]
  vae --> use2["Smooth latent space, blurrier samples"]
  dif --> use3["State-of-the-art quality, slower sampling"]`,
    explain: `All three learn to generate new data. GANs are a two-player game that produces sharp samples but can be unstable; VAEs learn a smooth latent space; diffusion models learn to reverse a gradual noising process and power most modern image generators.`,
  },

  /* -------------------------------------------------------------- 10 NLP & LLMs */
  {
    id: 'text-pipeline',
    where: { module: '10', topic: /character encoding|text cleaning|tokenization/i, section: /.*/i, fallbackFirst: true },
    title: 'From raw text to model input',
    mermaid: `
flowchart LR
  raw["Raw text"] --> clean["Clean and normalise — unicode, case, HTML"]
  clean --> tok["Tokenise — words or subwords (BPE, WordPiece)"]
  tok --> ids["Map tokens to ids"]
  ids --> rep{"Representation"}
  rep --> bow["Sparse: bag of words, TF-IDF"]
  rep --> emb["Dense: word / sentence embeddings"]
  rep --> ctx["Contextual: transformer hidden states"]`,
    explain: `Models never see text, only numbers. Text is normalised, split into tokens (subword tokenisers avoid out-of-vocabulary words), mapped to ids and then represented as sparse counts, static embeddings or contextual vectors from a transformer — each step a trade-off between simplicity and how much meaning is captured.`,
  },
  {
    id: 'tfidf',
    where: { module: '10', topic: /tf-idf/i, section: /tf-idf solution|visual intuition/i, fallbackFirst: true },
    title: 'TF-IDF weighs words by how distinctive they are',
    mermaid: `
flowchart LR
  tf["TF: how often the word appears in this document"] --> w(("TF × IDF"))
  idf["IDF: log(N / documents containing the word) — rare words score high"] --> w
  w --> v["Document vector: 'the' ≈ 0, 'refund' high"]`,
    explain: `Raw counts are dominated by common words. Multiplying term frequency by inverse document frequency boosts words that are frequent in one document but rare across the corpus. TF-IDF vectors with a linear model remain a strong, fast baseline for text classification and keyword search.`,
  },
  {
    id: 'word2vec',
    where: { module: '10', topic: /word2vec|embedding/i, section: /.*/i, fallbackFirst: true },
    title: 'Embeddings place similar meanings close together',
    mermaid: `
flowchart LR
  ctx["Learn from context: words in similar contexts get similar vectors"] --> space["Vector space"]
  space --> sim["cosine(king, queen) high, cosine(king, banana) low"]
  space --> analog["king − man + woman ≈ queen"]
  space --> use["Use in search, clustering, features for classifiers, RAG retrieval"]`,
    explain: `Word2Vec, GloVe and FastText learn dense vectors from co-occurrence, so related words end up near each other and some relationships become vector arithmetic. Sentence-embedding models extend the idea to whole texts, which is what semantic search and RAG retrieval use.`,
  },
  {
    id: 'finetune',
    where: { module: '10', topic: /fine-tuning|lora|peft/i, section: /lora|overview|training pipeline/i, fallbackFirst: true },
    title: 'Full fine-tuning vs LoRA',
    mermaid: `
flowchart LR
  base["Pre-trained model — billions of weights"] --> full["Full fine-tuning: update every weight — best quality, huge memory"]
  base --> lora["LoRA: freeze the base, train small low-rank matrices A·B added to attention weights"]
  lora --> q["QLoRA: same, with the frozen base quantised to 4-bit"]
  lora --> merge["Merge or swap adapters per task at serving time"]`,
    explain: `Fine-tuning adapts a pre-trained model to your data. LoRA trains only small low-rank update matrices (often under 1% of the parameters), so a large model fits on one GPU and each task is a tiny adapter file; QLoRA quantises the frozen base to cut memory further.`,
  },
  {
    id: 'ml-rag',
    where: { module: '10', topic: /rag: retrieval|retrieval-augmented/i, section: /.*/i, fallbackFirst: true },
    title: 'Retrieval-augmented generation',
    mermaid: `
flowchart LR
  docs["Documents"] --> chunk["Chunk + embed"] --> vdb[("Vector DB")]
  q["Question"] --> qe["Embed the question"] --> vdb
  vdb --> top["Top-k relevant chunks"]
  top --> prompt["Prompt = instructions + chunks + question"]
  prompt --> llm["LLM answers grounded in the chunks, with citations"]`,
    explain: `RAG gives a language model the relevant facts at question time instead of relying on what it memorised. Documents are chunked and embedded once; each question retrieves the closest chunks, which are placed in the prompt. The VeeraRAG course covers each stage in depth.`,
  },

  /* ------------------------------------------------------------------ 11 MLOps */
  {
    id: 'mlops-lifecycle',
    where: { module: '11', topic: /mlops/i, section: /overview|model deployment|research to production/i, fallbackFirst: true },
    title: 'The MLOps lifecycle',
    mermaid: `
flowchart LR
  data["Versioned data"] --> train["Training pipeline"]
  train --> track["Experiment tracking — MLflow, W&B"]
  track --> reg["Model registry — staging → production"]
  reg --> serve["Serving — REST API, batch, edge"]
  serve --> mon["Monitoring — latency, errors, data drift, accuracy"]
  mon -->|"drift or decay"| train`,
    explain: `MLOps applies software-engineering discipline to models: reproducible data and training, tracked experiments, a registry that controls which version is live, automated deployment and continuous monitoring. Models decay as the world changes, so monitoring for drift feeds straight back into retraining.`,
  },
  {
    id: 'serving',
    where: { module: '11', topic: /mlops/i, section: /rest api|serving|deployment/i, fallbackFirst: true },
    title: 'Serving a model behind an API',
    mermaid: `
sequenceDiagram
  participant C as Client
  participant A as FastAPI service
  participant P as Preprocessing pipeline
  participant M as Model (loaded once at startup)
  C->>A: POST /predict with features
  A->>A: validate input with Pydantic
  A->>P: same transforms as training
  P->>M: feature vector
  M-->>A: prediction + probability
  A-->>C: JSON response, logged for monitoring`,
    explain: `Load the serialized pipeline once at start-up, validate every request, apply exactly the preprocessing used in training (bundling it in the pipeline prevents training-serving skew) and log inputs and outputs so you can detect drift and retrain later.`,
  },
]
