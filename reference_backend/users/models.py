from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models


class User(AbstractUser):
    class Gender(models.TextChoices):
        MALE = 'male', 'Male'
        FEMALE = 'female', 'Female'

    email = models.EmailField(unique=True)
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(blank=True)
    gender = models.CharField(max_length=6, choices=Gender.choices, blank=True)
    can_try_to_kill = models.BooleanField(default=False)
    is_unkillable = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email


class ProfilePicture(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='profile_pictures')
    order = models.PositiveIntegerField()
    image_data = models.BinaryField(null=True, blank=True)
    image_url = models.URLField(blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
        constraints = [
            models.UniqueConstraint(fields=['user', 'order'], name='unique_profile_picture_order'),
        ]

    def clean(self):
        if not self.image_data and not self.image_url:
            raise ValidationError('A profile picture must provide either image data or a URL.')

    def __str__(self):
        return f"ProfilePicture(user={self.user}, order={self.order}, primary={self.is_primary})"


class Endorsement(models.Model):
    class EndorsementType(models.TextChoices):
        PLATONIC = 'platonic', 'Platonic'
        ROMANTIC = 'romantic', 'Romantic'

    first_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='endorsements_as_first')
    second_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='endorsements_as_second')

    first_user_approved = models.BooleanField(default=False)
    second_user_approved = models.BooleanField(default=False)

    endorsement_type = models.CharField(max_length=10, choices=EndorsementType.choices, default=EndorsementType.PLATONIC)

    is_joining_endorsement = models.BooleanField(default=False)

    first_user_statement = models.TextField(blank=True)
    second_user_statement = models.TextField(blank=True)

    first_user_did_approve_text = models.BooleanField(default=False)
    second_user_did_approve_text = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_romantic(self):
        return self.endorsement_type == self.EndorsementType.ROMANTIC

    def __str__(self):
        return f"Endorsement({self.first_user} <-> {self.second_user}, {self.endorsement_type})"


class Feedback(models.Model):
    comments = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback({self.id})"
