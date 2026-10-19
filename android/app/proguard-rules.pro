# Optimization and shrinking rules for BloodLab
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

# Keep data models
-keepclassmembers class com.example.bloodlab.** { *; }

# Jetpack Compose rules
-keep class androidx.compose.ui.** { *; }
-keep class androidx.compose.material3.** { *; }
