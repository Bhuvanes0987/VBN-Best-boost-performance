import pymysql

try:
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='Excel@123',
        port=3306
    )
    
    with connection.cursor() as cursor:
        cursor.execute("CREATE DATABASE IF NOT EXISTS quiz")
    connection.commit()
    print("Database 'quiz' created successfully.")
    connection.close()
except Exception as e:
    print(f"Error creating database: {e}")
