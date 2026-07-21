import pymysql

try:
    connection = pymysql.connect(host='localhost', user='root', password='Excel@123', database='quiz_copy', port=3306)
    with connection.cursor() as cursor:
        cursor.execute("SELECT email, status FROM users WHERE email='nandhinicomcast19@gmail.com';")
        user = cursor.fetchone()
        if user:
            print(f"User found in quiz_copy: email={user[0]}, status={user[1]}")
        else:
            print("User NOT found in quiz_copy")
    connection.close()
except Exception as e:
    print(e)
