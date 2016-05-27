#include <stdio.h> 
#include <stdlib.h>

int main( int argc, char *argv[]) 
{
char s[255]; 
printf("Playing Sound Clip %s...\n", argv[1]); 
sprintf(s, "gst-launch-1.0 filesrc location= /home/root/%s ! wavparse ! pulsesink",argv[1]);
system(s); 
//system("gst-launch-1.0 filesrc location= /home/root/ ! wavparse ! pulsesink");
}
