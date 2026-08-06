from django.db import models
from django.conf import settings

class ActivityLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='activity_logs'
    )
    action = models.TextField()
    module = models.CharField(max_length=100, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at', 'module']),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "System"
        return f"{user_str} - {self.action} ({self.created_at})"

    # Prevent saving modifications or deleting audit logs at the Django model layer
    def delete(self, *args, **kwargs):
        raise NotImplementedError("Audit logs cannot be deleted.")

    def save(self, *args, **kwargs):
        if self.pk is not None:
            # Allow SET_NULL cascade updates (Django passes update_fields=['user'])
            update_fields = kwargs.get('update_fields')
            if update_fields and set(update_fields) <= {'user'}:
                super().save(*args, **kwargs)
                return
            raise NotImplementedError("Audit logs cannot be modified.")
        super().save(*args, **kwargs)
