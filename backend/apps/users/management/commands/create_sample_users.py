from django.core.management.base import BaseCommand
from apps.users.models import User

SAMPLE_USERS = [
    ("Aarav Shah", "aarav@example.com"),
    ("Priya Nair", "priya@example.com"),
    ("Rohan Mehta", "rohan@example.com"),
    ("Sneha Iyer", "sneha@example.com"),
    ("Vikram Rao", "vikram@example.com"),
    ("Ananya Krishnan", "ananya@example.com"),
    ("Karan Malhotra", "karan@example.com"),
    ("Divya Pillai", "divya@example.com"),
    ("Arjun Sharma", "arjun@example.com"),
    ("Meera Joshi", "meera@example.com"),
    ("Nikhil Gupta", "nikhil@example.com"),
    ("Pooja Verma", "pooja@example.com"),
    ("Rahul Bose", "rahul@example.com"),
    ("Tanvi Desai", "tanvi@example.com"),
    ("Siddharth Kapoor", "siddharth@example.com"),
    ("Kavya Reddy", "kavya@example.com"),
    ("Aditya Kumar", "aditya@example.com"),
    ("Ishaan Pandey", "ishaan@example.com"),
    ("Shruti Mishra", "shruti@example.com"),
    ("Yash Patil", "yash@example.com"),
]

PASSWORD = "Password123"


class Command(BaseCommand):
    help = "Create 20 sample users for testing"

    def handle(self, *args, **options):
        created = 0
        skipped = 0
        for display_name, email in SAMPLE_USERS:
            if User.objects.filter(email=email).exists():
                skipped += 1
                continue
            User.objects.create_user(
                email=email,
                password=PASSWORD,
                display_name=display_name,
            )
            created += 1
            self.stdout.write(f"  Created {display_name} ({email})")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone — {created} created, {skipped} already existed."
        ))
        self.stdout.write(f"Password for all users: {PASSWORD}")
