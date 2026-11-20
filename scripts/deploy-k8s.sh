#!/bin/sh
set -e

echo "==> Creation de l'espace de noms Kubernetes careerquest"
kubectl apply -f k8s/namespace.yaml

echo "==> Application de la configuration et des secrets"
kubectl apply -f k8s/configmap.yaml -f k8s/secrets.yaml

echo "==> Deploiement de PostgreSQL 16 avec volume persistant (PVC 5Gi)"
kubectl apply -f k8s/postgres-pvc.yaml -f k8s/postgres-deployment.yaml -f k8s/postgres-service.yaml
kubectl rollout status deployment/careerquest-db -n careerquest --timeout=120s

echo "==> Deploiement de l'API Django REST (2 replicas + sondes /api/health/)"
kubectl apply -f k8s/backend-deployment.yaml -f k8s/backend-service.yaml
kubectl rollout status deployment/careerquest-backend -n careerquest --timeout=120s

echo "==> Deploiement de l'interface React Nginx (2 replicas)"
kubectl apply -f k8s/frontend-deployment.yaml -f k8s/frontend-service.yaml
kubectl rollout status deployment/careerquest-frontend -n careerquest --timeout=120s

echo "==> Configuration du routage externe Ingress"
kubectl apply -f k8s/ingress.yaml

echo "==> Etat final du cluster careerquest"
kubectl get deployments,services,ingress,pvc -n careerquest
