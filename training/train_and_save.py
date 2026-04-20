"""
train_and_save.py
-----------------
Run this ONCE to train the model and save it.
Your partner runs this on their machine with Data.csv in the same folder.

Usage:
    pip install pandas scikit-learn joblib
    python train_and_save.py

Outputs:
    model.pkl       — the trained stacking classifier
    vectorizer.pkl  — the fitted TF-IDF vectorizer
"""

import warnings
warnings.simplefilter('ignore')

import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

print("Loading data...")
df = pd.read_csv('Data.csv', encoding='latin-1')

# Keep only the two relevant columns
data = df[['v1', 'v2']].copy()
data.columns = ['Category', 'Message']

# Alternatively if your CSV already has 'Category' and 'Message' columns:
# data = df.drop(labels=['Unnamed: 2', 'Unnamed: 3', 'Unnamed: 4'], axis=1, errors='ignore')

# Encode labels: spam=0, ham=1
data.loc[data['Category'] == 'spam', 'Category'] = 0
data.loc[data['Category'] == 'ham',  'Category'] = 1
data['Category'] = data['Category'].astype(int)

print(f"Dataset size: {len(data)} messages")
print(f"Spam: {(data['Category']==0).sum()}  Ham: {(data['Category']==1).sum()}")

X = data['Message']
Y = data['Category']

X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.2, random_state=3)

print("\nFitting TF-IDF vectorizer...")
vectorizer = TfidfVectorizer(min_df=1, stop_words='english', lowercase=True)
X_train_f = vectorizer.fit_transform(X_train)
X_test_f  = vectorizer.transform(X_test)

print("Training stacking classifier (this may take ~30 seconds)...")
estimators = [
    ('lr',  LogisticRegression()),
    ('dt',  DecisionTreeClassifier()),
    ('knn', KNeighborsClassifier()),
    ('rf',  RandomForestClassifier()),
]
stack = StackingClassifier(
    estimators=estimators,
    final_estimator=LogisticRegression(),
    cv=5
)
stack.fit(X_train_f, Y_train)

# Evaluate
preds = stack.predict(X_test_f)
print("\n=== Model performance ===")
print(f"Test accuracy : {accuracy_score(Y_test, preds):.4f}")
print(f"Precision     : {precision_score(Y_test, preds):.4f}")
print(f"Recall        : {recall_score(Y_test, preds):.4f}")
print(f"F1 Score      : {f1_score(Y_test, preds):.4f}")

# Save both the model and vectorizer — you need BOTH to make predictions
print("\nSaving model.pkl and vectorizer.pkl...")
joblib.dump(stack,      'model.pkl')
joblib.dump(vectorizer, 'vectorizer.pkl')
print("Done! Copy model.pkl and vectorizer.pkl into the same folder as api.py")
