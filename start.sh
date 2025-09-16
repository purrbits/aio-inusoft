# nohup python3 a.py > app.log 2>&1 &

nohup ./cf tunnel run --url http://localhost:3004 --token xxxx > tunnel.log 2>&1 &

python3 app.py