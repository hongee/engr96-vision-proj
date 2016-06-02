#include <stdlib.h>
#include <stdio.h>

int main(int argc, char *argv[])
{
system("bash connectSpeaker.sh"); 
//printf("connected to speaeker!\n");
char s[100];
sprintf(s,"./playAudio %s",argv[1]);  
system(s);
}
