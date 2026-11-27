<!-- Curated for the VeeraML track: the .ml sources contain almost no interview Q&A.
     Answers follow concept → how it works → when/why → tradeoff. -->

# Machine Learning Interview Bank

## Foundations & workflow

### Q1: What is the difference between supervised, unsupervised and reinforcement learning?

Supervised learning trains on examples that have the correct answer (a label): regression when the label is a number, classification when it is a category. Unsupervised learning has no labels and looks for structure — clusters, lower-dimensional representations or anomalies. Reinforcement learning learns a policy from rewards received after actions, as in games or recommendation loops. In practice the available data decides: if you can get labels cheaply, supervised learning is usually the most direct route; otherwise unsupervised methods or weak/self-supervision help create them.

### Q2: Why do we need separate train, validation and test sets?

The training set fits model parameters, the validation set chooses between models and hyperparameters, and the test set gives one final, unbiased estimate. If you tune on the test set it stops being unseen data and the reported score becomes optimistic. With limited data, cross-validation on the training portion replaces a fixed validation set, but the test set is still touched once at the end.

### Q3: What is data leakage? Give two examples.

Leakage is when information that would not be available at prediction time reaches the model during training, so offline scores look great and production performance collapses. Example one: fitting a scaler or imputer on the full dataset before splitting, which leaks test statistics. Example two: a feature that is a consequence of the label, such as "refund_issued" when predicting fraud, or using future data in a time series. Prevent it by splitting first, putting every preprocessing step inside a Pipeline, and asking for each feature "would I know this at the moment of prediction?".

### Q4: What is the bias-variance tradeoff?

Expected error decomposes into bias², variance and irreducible noise. Bias is error from overly simple assumptions (underfitting: train and test error both high); variance is sensitivity to the particular training sample (overfitting: low train error, high test error). Increasing model capacity lowers bias and raises variance. You manage it with regularisation, more data, ensembling and by choosing complexity with validation curves.

### Q5: Batch learning vs online learning — when would you use each?

Batch learning retrains on the full dataset periodically; it is simple, reproducible and fine when data changes slowly. Online learning updates the model incrementally as each example or mini-batch arrives (e.g. SGDClassifier.partial_fit), which suits huge streams or fast-changing behaviour such as fraud or ad click-through. The trade-off is stability and monitoring: online models can drift quickly with bad data, so they need guardrails and rollback.

## Data preparation & feature engineering

### Q6: Which models need feature scaling and which do not?

Models that use distances or gradient-based optimisation need it: KNN, K-means, SVM, linear and logistic regression with regularisation, neural networks and PCA. Without scaling, the feature with the largest numeric range dominates. Tree-based models (decision trees, random forests, gradient boosting) split one feature at a time and are scale-invariant. Use StandardScaler by default, RobustScaler with outliers, and always fit it on the training split only.

### Q7: How do you handle missing values?

First ask why values are missing. If missingness is random and rare, median/mode imputation or dropping rows is fine. If it is informative (no loan → no loan amount), impute and add an "is_missing" indicator, which is often a strong feature. If it depends on other features, use KNN or iterative imputation. Whatever you choose is a learned transformation, so it goes inside the Pipeline and is fit on training folds only. Gradient-boosting libraries like XGBoost and LightGBM can also handle missing values natively.

### Q8: One-hot encoding vs target encoding — trade-offs?

One-hot encoding creates a binary column per category; it is safe and interpretable but explodes with high cardinality and is sparse. Target encoding replaces each category with the mean target for that category, which is compact and powerful for features like city or product id, but it leaks the label unless computed out-of-fold with smoothing. Ordinal encoding is only correct when the categories have a real order.

### Q9: Your dataset has 1% positive class. How do you approach it?

First change the metric: accuracy is useless here, so use precision, recall, F1 and PR-AUC, ideally tied to the cost of false positives and false negatives. Then try class weights, which are cheap and often enough; resampling such as SMOTE or undersampling applied only inside the training folds; and tuning the decision threshold on validation data. Stratified splits keep the positive rate consistent across folds.

### Q10: What does fit, transform and fit_transform do, and why does it matter?

fit learns parameters from data (a scaler's mean and standard deviation, an encoder's categories); transform applies already-learned parameters; fit_transform does both on training data. You must only call transform on validation, test and production data, otherwise each set is scaled differently and statistics leak. A scikit-learn Pipeline enforces this automatically and lets cross-validation refit every step per fold.

## Regression & linear models

### Q11: Explain linear regression and its assumptions.

Linear regression models the target as a weighted sum of features plus a bias and chooses weights that minimise mean squared error, solved with the normal equation or gradient descent. Key assumptions are linearity, independent errors, constant error variance (homoscedasticity), and normally distributed residuals for valid inference; strongly correlated features (multicollinearity) make coefficients unstable. Check residual plots: patterns mean a missing non-linearity or interaction.

### Q12: Ridge vs Lasso — what is the difference?

Both add a penalty on weight size to the loss. Ridge (L2) penalises squared weights and shrinks all of them smoothly, which helps with multicollinearity but keeps every feature. Lasso (L1) penalises absolute weights and drives some exactly to zero, performing feature selection. Elastic Net combines them and is more stable when correlated features compete. The penalty strength α is chosen by cross-validation and features must be scaled first.

### Q13: MSE vs MAE vs Huber loss — when would you choose each?

MSE squares errors, predicts the conditional mean and heavily penalises large misses, so outliers dominate. MAE predicts the median and is robust to outliers but has a non-smooth gradient at zero. Huber loss is quadratic for small errors and linear for large ones, combining smooth optimisation with robustness. Choose based on how much a big miss costs the business relative to many small ones.

### Q14: Why can R² be negative on a test set?

R² compares the model's squared error with that of always predicting the mean of the evaluation data. On training data with an intercept it is between 0 and 1, but on a test set a badly overfit or mis-specified model can be worse than the mean baseline, giving a negative R². It is a signal to look at overfitting, leakage or distribution shift.

## Classification

### Q15: Explain logistic regression. Why is it called regression?

It computes a linear score w·x + b and passes it through the sigmoid to get a probability, then thresholds it to classify. It is called regression because it models a continuous quantity — the log-odds of the positive class — as a linear function of the features. It is trained by minimising binary cross-entropy, gives calibrated probabilities and interpretable coefficients, and its decision boundary is linear unless you add feature interactions.

### Q16: Precision vs recall — give an example where each matters more.

Precision is the share of predicted positives that are correct; recall is the share of actual positives you catch. Precision matters when false alarms are expensive, such as a spam filter hiding a customer's real email. Recall matters when misses are expensive, such as cancer screening or fraud detection. F1 balances both, and moving the decision threshold trades one for the other.

### Q17: ROC-AUC vs PR-AUC?

ROC-AUC measures how well the model ranks positives above negatives across all thresholds, plotting true positive rate against false positive rate. With heavy class imbalance the false positive rate stays tiny even with many false alarms, so ROC-AUC looks flattering. PR-AUC plots precision against recall and focuses on the positive class, so it is more informative for rare-event problems such as fraud.

### Q18: How does KNN work and what are its weaknesses?

KNN stores the training data and predicts by majority vote (or average) of the k closest points. It has no training cost but slow prediction, is sensitive to feature scaling and irrelevant features, and degrades in high dimensions because distances become similar (curse of dimensionality). Small k overfits, large k underfits; choose k by cross-validation and use KD-trees or approximate nearest-neighbour indexes for speed.

### Q19: What is the kernel trick in SVMs?

An SVM only needs dot products between examples. A kernel function computes the dot product of the examples in a higher-dimensional feature space without constructing that space, letting a linear separator there become a non-linear boundary in the original space. The RBF kernel's γ controls how local each support vector's influence is — high γ overfits — and C controls the penalty for margin violations.

### Q20: How does a decision tree decide where to split, and how do you stop it overfitting?

At each node it tries features and thresholds and keeps the split that most reduces impurity — Gini or entropy for classification, variance for regression. Grown fully, it memorises the training data. Control it with max_depth, min_samples_leaf, min_samples_split and cost-complexity pruning, or use it inside an ensemble where overfitting individual trees is averaged out.

### Q21: Why does Naive Bayes work well for text despite its "naive" assumption?

It assumes features are independent given the class, which is false for words, but classification only needs the correct ranking of class scores, not accurate probabilities. With thousands of word features and little data, its strong assumption acts as regularisation, it trains in one pass and handles high dimensionality well. Laplace smoothing prevents zero probabilities for unseen words.

## Ensembles

### Q22: Bagging vs boosting?

Bagging trains many models in parallel on bootstrap samples and averages them; it mainly reduces variance and works best with high-variance learners like deep trees (random forest). Boosting trains weak learners sequentially, each focusing on the previous errors; it mainly reduces bias and usually achieves higher accuracy on tabular data (gradient boosting, XGBoost), but is more sensitive to noise and hyperparameters and can overfit with too many rounds.

### Q23: Why does a random forest work better than a single decision tree?

A single deep tree has low bias but very high variance. A random forest averages hundreds of trees trained on bootstrap samples and, at each split, only a random subset of features, which decorrelates the trees so their errors cancel. Adding trees does not overfit; it just costs compute. It also provides out-of-bag error estimates and feature importances.

### Q24: Explain gradient boosting in simple terms.

Start with a simple prediction such as the mean. Compute the residuals — for squared error, the negative gradient of the loss — and fit a small tree to predict them. Add that tree's predictions scaled by a learning rate, recompute residuals and repeat. Each tree corrects what the ensemble still gets wrong. Key hyperparameters are learning rate, number of trees (with early stopping), tree depth and subsampling.

### Q25: What makes XGBoost faster and better than plain gradient boosting?

It adds L1/L2 regularisation on leaf weights, uses second-order (Hessian) information for better split decisions, handles missing values by learning a default direction, finds splits with histogram/approximate algorithms in parallel, and supports column and row subsampling. LightGBM uses leaf-wise growth and histogram binning for even more speed; CatBoost handles categorical features with ordered target statistics.

## Unsupervised learning

### Q26: How does K-means work and how do you choose k?

It initialises k centroids (k-means++ spreads them out), assigns each point to the nearest centroid, moves each centroid to the mean of its points and repeats until assignments stop changing. Choose k with the elbow method on inertia, silhouette scores, or business constraints. K-means assumes roughly spherical, similar-sized clusters and needs scaled features; for odd shapes use DBSCAN or Gaussian mixtures.

### Q27: When would you use DBSCAN instead of K-means?

When clusters have arbitrary shapes, when you do not know the number of clusters, or when you need to flag outliers. DBSCAN groups points that have at least min_samples neighbours within eps and labels isolated points as noise. Its weakness is clusters with very different densities, because a single eps has to fit all of them; HDBSCAN addresses that.

### Q28: What does PCA do and what are its limitations?

PCA finds orthogonal directions of maximum variance — eigenvectors of the covariance matrix — and projects the data onto the top k of them, reducing dimensionality while keeping most variance. It decorrelates features, speeds up training and helps visualisation. Limitations: it only captures linear structure, the components are hard to interpret, it is sensitive to scaling and outliers, and high variance does not always mean useful for prediction.

### Q29: PCA vs t-SNE vs UMAP?

PCA is linear, fast, deterministic and can transform new data, so it is used for preprocessing. t-SNE and UMAP are non-linear and preserve local neighbourhoods, producing much better 2-D visualisations of clusters, but distances between far-apart clusters are not meaningful. t-SNE is slow and mainly for visualisation; UMAP is faster, preserves more global structure and can transform new points.

## Evaluation, validation & tuning

### Q30: What is k-fold cross-validation and when should you use variants?

The data is split into k folds; the model trains on k−1 and validates on the remaining fold, k times, and the scores are averaged. It gives a more reliable estimate than one split and a measure of variance. Use stratified k-fold for imbalanced classification, group k-fold when samples from one entity must stay together, and time-series split when order matters so you never train on the future.

### Q31: How do you detect overfitting and what do you do about it?

Overfitting shows as a large gap between training and validation performance, visible in learning curves. Remedies: more data or augmentation, regularisation (L1/L2, dropout, weight decay), simpler models or shallower trees, early stopping, feature selection, and ensembling. Underfitting is the opposite — both scores low — and needs more capacity or better features.

### Q32: Grid search vs random search vs Bayesian optimisation?

Grid search tries every combination; it is exhaustive but explodes with many hyperparameters. Random search samples combinations and, for the same budget, explores important dimensions better because only a few hyperparameters usually matter. Bayesian optimisation (Optuna) builds a model of past results and chooses the next trial where improvement looks likely, which is most efficient for expensive models. All of them should score with cross-validation, and nested CV gives an unbiased estimate of the tuned model.

### Q33: What is regularisation, in general terms?

Any technique that constrains a model to reduce overfitting: penalties on weight size (L1, L2), limiting capacity (tree depth, number of layers), adding noise (dropout, data augmentation), early stopping and ensembling. Probabilistically, L2 and L1 correspond to Gaussian and Laplace priors on the weights (MAP estimation). Its strength is a hyperparameter chosen by validation.

## Deep learning

### Q34: Explain backpropagation.

After a forward pass computes predictions and the loss, backpropagation applies the chain rule from the loss backwards through each layer to compute the gradient of the loss with respect to every weight, reusing intermediate results so it costs about as much as the forward pass. An optimizer then updates the weights using those gradients. Frameworks automate it with automatic differentiation over a computational graph.

### Q35: What are vanishing and exploding gradients and how are they fixed?

Gradients in early layers are products of many per-layer derivatives; if those are mostly below 1 the gradient shrinks toward zero and early layers stop learning, and if above 1 it explodes into NaNs. Fixes: ReLU-family activations instead of sigmoid/tanh, He/Xavier initialisation, batch or layer normalisation, residual connections, LSTM/GRU gates for sequences, and gradient clipping for explosions.

### Q36: Why is ReLU preferred over sigmoid in hidden layers?

ReLU does not saturate for positive inputs, so gradients flow through deep networks, and it is cheap to compute and produces sparse activations. Sigmoid saturates at both ends, has a maximum derivative of 0.25 and is not zero-centred, which slows training. ReLU can produce dead neurons that always output zero; Leaky ReLU, ELU or GELU mitigate that.

### Q37: Batch normalization — what does it do?

It normalises each layer's pre-activations over the mini-batch to zero mean and unit variance, then applies a learned scale and shift. It allows higher learning rates, reduces sensitivity to initialisation and adds mild regularisation. At inference it uses running averages of the batch statistics, so you must switch the model to evaluation mode. Transformers typically use layer normalisation instead because it does not depend on batch size.

### Q38: SGD vs Adam?

SGD updates every weight with the same learning rate; with momentum it smooths the direction. Adam adapts the step size per parameter using running averages of the gradient and its square, converging quickly with little tuning. AdamW decouples weight decay and is the default for transformers. Well-tuned SGD with momentum sometimes generalises slightly better for vision models; learning-rate schedules matter for both.

### Q39: How does self-attention work?

Each token is projected into a query, key and value. Its query is compared with every key via scaled dot products, softmax turns the scores into weights, and the output is the weighted sum of the values — so each token's representation mixes in information from relevant tokens anywhere in the sequence. Multi-head attention runs several of these in parallel, and positional encodings add order information because attention itself is order-agnostic.

### Q40: What is transfer learning and when is it useful?

Reusing a model pre-trained on a large dataset (ImageNet, a large text corpus) and adapting it to your task, either by training only a new head on frozen features or by fine-tuning some or all layers with a small learning rate. It is most useful when you have limited labelled data, because the pre-trained layers already encode general features like edges or syntax.

## NLP, transformers & LLMs

### Q41: Bag of words vs TF-IDF vs embeddings?

Bag of words counts word occurrences, ignoring order; TF-IDF reweights counts so words that are frequent in a document but rare across documents dominate. Both are sparse, fast and interpretable, and strong baselines with linear models. Embeddings are dense vectors learned so that similar meanings are close; contextual embeddings from transformers also capture word sense and order, at higher compute cost.

### Q42: BERT vs GPT?

BERT is an encoder-only transformer trained with masked-language modelling, so it sees context on both sides and is strong for understanding tasks such as classification, NER and retrieval embeddings. GPT is a decoder-only transformer trained to predict the next token with causal masking, which makes it a natural text generator. T5-style encoder-decoders frame every task as text-to-text.

### Q43: What is LoRA and why is it popular?

Low-Rank Adaptation freezes the pre-trained weights and learns small low-rank matrices whose product is added to selected weight matrices, typically in attention layers. It trains well under 1% of the parameters, cuts memory so large models fit on one GPU, and produces tiny per-task adapters that can be swapped or merged at serving time. QLoRA additionally quantises the frozen base model to 4-bit.

### Q44: RAG vs fine-tuning — how do you choose?

RAG retrieves relevant documents at query time and puts them in the prompt; it is best when knowledge changes often, must be cited, or is private and large. Fine-tuning changes the model's weights; it is best for teaching a format, style, domain language or a narrow task. They combine well: fine-tune for behaviour, retrieve for facts.

## MLOps & production

### Q45: What is training-serving skew and how do you prevent it?

It is a mismatch between how features are computed in training and in production — a different scaler, a different encoding of categories, or a feature computed with future data offline. Prevent it by serialising the whole preprocessing-plus-model pipeline as one artifact, sharing feature code (or a feature store) between training and serving, validating inputs at the API, and monitoring feature distributions in production.

### Q46: What is data drift vs concept drift?

Data (covariate) drift means the input distribution changes — new customer segments, a sensor recalibrated. Concept drift means the relationship between inputs and the target changes — fraud patterns adapt, user preferences shift. Monitor input statistics (PSI, KS tests) and, when labels arrive, model metrics; trigger retraining or investigation when they cross thresholds.

### Q47: How would you deploy a scikit-learn model as an API?

Save the full Pipeline with joblib, load it once at application start-up in a FastAPI service, validate requests with Pydantic, call predict or predict_proba, and return JSON. Package it in a Docker image, version the model in a registry such as MLflow, add health checks, structured logging of inputs and outputs, latency metrics and drift monitoring, and roll out new versions with canary or shadow deployments.

## Scenario-based questions

### Scenario 1: Your model scores 98% accuracy in validation but performs poorly in production. What do you check?

I would first suspect leakage: preprocessing fit before splitting, features that are only known after the outcome, or duplicate entities across splits. Next I would check training-serving skew by comparing the feature values the model receives in production with the training data, and distribution shift between the validation period and today. I would also confirm the metric — 98% accuracy on a 98/2 class split means the model may predict only the majority class. Fixes follow from the cause: rebuild the pipeline so everything is fit inside folds, split by time or by entity, and add production monitoring.

### Scenario 2: You have 10,000 features and 2,000 rows. How do you build a reliable model?

This is a high-dimensional, small-sample problem, so overfitting is the main risk. I would start with a strongly regularised linear model (L1 or Elastic Net) for implicit feature selection, compare with a random forest, and evaluate with repeated stratified cross-validation, keeping any feature selection inside the folds. Dimensionality reduction such as PCA or domain-driven feature grouping can help, and I would report the variance of the CV scores, not just the mean.

### Scenario 3: A fraud model must catch most fraud but the operations team can only review 200 alerts a day. How do you set it up?

The constraint is precision at a fixed alert budget, so I would rank transactions by predicted probability and evaluate precision@200 and recall at that cut-off on a time-based validation set. Train with class weights or boosting suited to imbalance, choose the threshold so the expected number of daily alerts is about 200, and monitor both the alert volume and the fraud caught, retraining as fraud patterns drift.

### Scenario 4: Training loss is decreasing but validation loss started increasing after epoch 5. What is happening and what do you do?

The model has started to overfit: it keeps fitting the training data while generalisation gets worse. I would use early stopping with the best checkpoint around epoch 5, add regularisation such as dropout or weight decay, use data augmentation or more data, and possibly reduce model size or the learning rate. I would also double-check that the validation set comes from the same distribution as the training set.

### Scenario 5: Your gradient-boosting model's training loss goes to NaN halfway through training. How do you debug it?

NaNs usually come from bad inputs or numerical blow-up. I would check for infinite or extremely large feature values and NaNs that the library does not handle, then lower the learning rate and check for extreme target values or a custom loss with a division or log of zero. In neural networks I would also add gradient clipping and check the initialisation and mixed-precision loss scaling.
